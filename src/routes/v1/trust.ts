import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { evaluateTrust, reportFraud } from "../../modules/trust/index.js";

import { verifySentraApiKey } from "../../middleware/auth.js";

const evaluateSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
});

const reportFraudSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  type: z.string(),
  severity: z.number().min(1).max(5),
  description: z.string().optional(),
});

type EvaluateBody = z.infer<typeof evaluateSchema>;
type ReportFraudBody = z.infer<typeof reportFraudSchema>;

export default async function (fastify: FastifyInstance) {
  fastify.addHook("preHandler", verifySentraApiKey);

  fastify.post(
    "/trust/evaluate",
    {
      schema: {
        description: "Evaluate the trust score of a phone number using network signals and collective nexus intelligence",
        tags: ["Trust"],
        security: [{ apiKey: [] }],
        body: {
          type: "object",
          properties: {
            phoneNumber: { type: "string", pattern: "^\\+?[1-9]\\d{1,14}$" },
          },
          required: ["phoneNumber"],
        },
      },
    },
    async function (request: FastifyRequest<{ Body: EvaluateBody }>, reply: FastifyReply) {
      const { phoneNumber } = evaluateSchema.parse(request.body);
      request.log.info({ phoneNumber }, "Evaluating trust for phone number");
      const result = await evaluateTrust(phoneNumber);
      return result;
    },
  );

  fastify.post(
    "/trust/report-fraud",
    {
      schema: {
        description: "Report a confirmed fraud incident to the collective intelligence network",
        tags: ["Trust"],
        security: [{ apiKey: [] }],
        body: {
          type: "object",
          properties: {
            phoneNumber: { type: "string" },
            type: { type: "string", enum: ["account_takeover", "scam", "payment_fraud", "identity_theft"] },
            severity: { type: "integer", minimum: 1, maximum: 5 },
            description: { type: "string" },
          },
          required: ["phoneNumber", "type", "severity"],
        },
      },
    },
    async function (request: FastifyRequest<{ Body: ReportFraudBody }>, reply: FastifyReply) {
      const body = reportFraudSchema.parse(request.body);
      const clientId = request.apiKeyId || "unknown_client";
      
      const result = await reportFraud(
        body.phoneNumber,
        clientId,
        body.type,
        body.severity,
        body.description || ""
      );
      
      if (!result.success) {
        return reply.status(404).send(result);
      }
      
      return result;
    },
  );
}

