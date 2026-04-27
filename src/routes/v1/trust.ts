import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { evaluateTrust, reportFraud } from "../../modules/trust/index.js";
import { verifySentraApiKey } from "../../middleware/auth.js";

// [VM-1 FIX] fraudType is now a proper Zod enum — previously z.string() allowed arbitrary values
const FRAUD_TYPES = ["account_takeover", "scam", "payment_fraud", "identity_theft"] as const;

const evaluateSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, "Phone number must be in E.164 format (e.g. +33612345678)"),
});

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

type EvaluateBody = z.infer<typeof evaluateSchema>;
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
          max: 10,
          timeWindow: "1 minute",
        },
      },
      schema: {
        description: "Evaluate the trust score of a phone number using network signals and collective nexus intelligence",
        tags: ["Trust"],
        security: [{ apiKey: [] }],
        body: {
          type: "object",
          properties: {
            phoneNumber: {
              type: "string",
              pattern: "^\\+[1-9]\\d{1,14}$",
              description: "E.164 format phone number (e.g. +33612345678)",
            },
          },
          required: ["phoneNumber"],
        },
      },
    },
    async function (request: FastifyRequest<{ Body: EvaluateBody }>, reply: FastifyReply) {
      const { phoneNumber } = evaluateSchema.parse(request.body);
      // [VH-7 FIX] Do NOT log the raw phone number — log a masked version
      const maskedPhone = phoneNumber.slice(0, 4) + "****" + phoneNumber.slice(-2);
      request.log.info({ phoneNumber: maskedPhone }, "Evaluating trust score");
      const result = await evaluateTrust(phoneNumber);
      return result;
    },
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
