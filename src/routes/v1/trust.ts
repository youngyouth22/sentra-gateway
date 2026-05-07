import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { evaluateTrust, reportFraud, hashPhone } from "../../modules/trust/index.js";
import { verifySentraApiKey } from "../../middleware/auth.js";
import { EvaluateRequestSchema, EvaluateRequest } from "../../modules/trust/types.js";
import { supabase } from "../../plugins/supabase.js";

const FRAUD_TYPES = ["account_takeover", "scam", "payment_fraud", "identity_theft"] as const;

const reportFraudSchema = z.object({
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/),
  // [VM-1 FIX] Strict enum — no arbitrary string injection possible
  type: z.enum(FRAUD_TYPES, {
    errorMap: () => ({
      message: `type must be one of: ${FRAUD_TYPES.join(", ")}`,
    }),
  }),
  severity: z.number().int().min(1).max(5),
  description: z.string().max(1000).optional(),
});

type ReportFraudBody = z.infer<typeof reportFraudSchema>;

export default async function (fastify: FastifyInstance) {
  fastify.addHook("preHandler", verifySentraApiKey);

  // [VH-6 FIX] Stricter rate limit on the expensive trust evaluation endpoint
  // This calls 3 Nokia APIs — 10 req/min per key is more appropriate
  fastify.post(
    "/trust/evaluate",
    {
      config: {
        rateLimit: {
          max: 100, // Increased as requested
          timeWindow: "1 minute",
        },
      },
      schema: {
        description: "Evaluate the trust score of a phone number using network signals and collective nexus intelligence",
        tags: ["Trust"],
        security: [{ apiKey: [] }],
        body: {
          type: "object",
          required: ["phone_number", "transaction_amount", "transaction_currency", "sender_phone", "timestamp"],
          properties: {
            phone_number: { type: "string", pattern: "^\\+[1-9]\\d{1,14}$" },
            transaction_amount: { type: "number" },
            transaction_currency: { type: "string", minLength: 3, maxLength: 3 },
            sender_phone: { type: "string", pattern: "^\\+[1-9]\\d{1,14}$" },
            device_id: { type: "string" },
            device_trusted: { type: "boolean" },
            sender_location: {
              type: "object",
              properties: {
                latitude: { type: "number" },
                longitude: { type: "number" },
                country_code: { type: "string" }
              }
            },
            timestamp: { type: "string", format: "date-time" }
          }
        },
        response: {
          200: {
            description: "Trust evaluation result",
            type: "object",
            properties: {
              phone_number: { type: "string" },
              risk_score: { type: "number" },
              risk_level: { type: "string" },
              decision: { type: "string" },
              confidence: { type: "number" },
              signals: { type: "object" },
              recommended_action: { type: "string" },
              explanation: { type: "string" },
              evaluated_at: { type: "string" },
              processing_time_ms: { type: "number" }
            }
          }
        }
      },
    },
    async function (request: FastifyRequest<{ Body: EvaluateRequest }>, reply: FastifyReply) {
      const body = EvaluateRequestSchema.parse(request.body);
      
      // [SECURITY] Hash phone number in logs
      const maskedPhone = hashPhone(body.phone_number).slice(0, 12) + "...";
      request.log.info({ phoneHash: maskedPhone }, "Evaluating trust score");
      
      const result = await evaluateTrust(body, request.sentraUser.uid);
      return result;
    },
  );

  fastify.get(
    "/trust/explain/:phoneNumber",
    {
      schema: {
        description: "Get full signal breakdown for a phone number (Compliance & Risk teams)",
        tags: ["Trust"],
        security: [{ apiKey: [] }],
        params: {
          type: "object",
          properties: {
            phoneNumber: { type: "string", pattern: "^\\+[1-9]\\d{1,14}$" }
          }
        }
      }
    },
    async function (request: FastifyRequest<{ Params: { phoneNumber: string } }>, reply: FastifyReply) {
      const { phoneNumber } = request.params;
      const phoneHash = hashPhone(phoneNumber);

      const { data: evaluations } = await supabase
        .from("trust_evaluations")
        .select("*")
        .eq("phone_hash", phoneHash)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!evaluations || evaluations.length === 0) {
        return reply.status(404).send({ error: "Not Found", message: "No evaluation history found for this number" });
      }

      return evaluations[0];
    }
  );

  fastify.post(
    "/trust/report-fraud",
    {
      // [VH-6 FIX] Very strict limit on fraud reporting to prevent spam attacks
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
      schema: {
        description: "Report a confirmed fraud incident to the collective intelligence network",
        tags: ["Trust"],
        security: [{ apiKey: [] }],
        body: {
          type: "object",
          properties: {
            phoneNumber: { type: "string" },
            type: {
              type: "string",
              enum: [...FRAUD_TYPES],
            },
            severity: { type: "integer", minimum: 1, maximum: 5 },
            description: { type: "string", maxLength: 1000 },
          },
          required: ["phoneNumber", "type", "severity"],
        },
        response: {
          200: {
            description: "Fraud report processed",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              reportId: { type: "string" }
            }
          },
          400: { $ref: "ErrorResponse#" },
          401: { $ref: "ErrorResponse#" },
          403: { $ref: "ErrorResponse#" },
          404: { $ref: "ErrorResponse#" },
          429: { $ref: "ErrorResponse#" },
          500: { $ref: "ErrorResponse#" },
        }
      },
    },
    async function (request: FastifyRequest<{ Body: ReportFraudBody }>, reply: FastifyReply) {
      const body = reportFraudSchema.parse(request.body);
      const clientId = request.apiKeyId!;

      const result = await reportFraud(
        body.phoneNumber,
        clientId,
        body.type,
        body.severity,
        body.description || "",
      );

      if (!result.success) {
        return reply.status(404).send({ error: "Not Found", message: "Identity not found" });
      }

      return result;
    },
  );
}
