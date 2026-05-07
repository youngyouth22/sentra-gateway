import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { initiateTransaction } from "../../modules/transaction/index.js";
import { verifySentraApiKey } from "../../middleware/auth.js";
import { handleIdempotency, saveIdempotency } from "../../middleware/idempotency.js";

const initiateSchema = z.object({
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/),
  amount: z.number().positive(),
});

export default async function (fastify: FastifyInstance) {
  fastify.addHook("preHandler", verifySentraApiKey);

  fastify.post(
    "/transaction/initiate",
    {
      // [B2B IDEMPOTENCY] Prevent duplicate transaction logic execution
      preHandler: [handleIdempotency],
      schema: {
        description: "Initiate a new trust-scored transaction with idempotency support",
        tags: ["Transaction"],
        security: [{ apiKey: [] }],
        headers: {
          type: "object",
          properties: {
            "x-idempotency-key": { type: "string" },
          },
        },
        body: {
          type: "object",
          properties: {
            phoneNumber: { type: "string" },
            amount: { type: "number" },
          },
          required: ["phoneNumber", "amount"],
        },
        response: {
          200: {
            description: "Transaction initiation result",
            type: "object",
            properties: {
              transactionId: { type: "string" },
              approved: { type: "boolean" },
              risk_score: { type: "number" },
              risk_level: { type: "string" },
              decision: { type: "string" },
              recommended_action: { type: "string" },
              explanation: { type: "string" }
            }
          },
          400: { $ref: "ErrorResponse#" },
          401: { $ref: "ErrorResponse#" },
          403: { $ref: "ErrorResponse#" },
          429: { $ref: "ErrorResponse#" },
          500: { $ref: "ErrorResponse#" },
        }
      },
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      const body = initiateSchema.parse(request.body);
      
      const result = await initiateTransaction(body, request.sentraUser.uid);

      // [B2B IDEMPOTENCY] Cache result for retries
      await saveIdempotency(request, 200, result);

      return result;
    },
  );
}
