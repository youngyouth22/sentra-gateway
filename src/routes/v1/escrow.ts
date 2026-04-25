import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { createEscrow, releaseEscrow } from "../../modules/escrow/index.js";

const createSchema = z.object({
  senderPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  receiverPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  amount: z.number().positive(),
});

const releaseSchema = z.object({
  escrowId: z.string(),
});

import { verifySentraApiKey } from "../../middleware/auth.js";

const createEscrowSchema = z.object({
  buyerPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  sellerPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  amount: z.number().positive(),
});

export default async function (fastify: FastifyInstance) {
  fastify.addHook("preHandler", verifySentraApiKey);
  fastify.post(
    "/escrow/create",
    {
      schema: {
        description: "Create a new escrow transaction",
        tags: ["Escrow"],
        body: {
          type: "object",
          properties: {
            senderPhone: { type: "string" },
            receiverPhone: { type: "string" },
            amount: { type: "number" },
          },
          required: ["senderPhone", "receiverPhone", "amount"],
        },
      },
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      const body = createSchema.parse(request.body);
      const result = await createEscrow(body);
      return result;
    },
  );

  fastify.post(
    "/escrow/release",
    {
      schema: {
        description: "Release funds from an existing escrow",
        tags: ["Escrow"],
        body: {
          type: "object",
          properties: {
            escrowId: { type: "string" },
          },
          required: ["escrowId"],
        },
      },
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      const { escrowId } = releaseSchema.parse(request.body);
      const result = await releaseEscrow(escrowId);
      return result;
    },
  );
}
