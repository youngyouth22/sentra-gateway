import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { createEscrow, releaseEscrow } from "../../modules/escrow/index.js";
import { verifySentraApiKey } from "../../middleware/auth.js";

const createSchema = z.object({
  senderPhone: z.string().regex(/^\+[1-9]\d{1,14}$/),
  receiverPhone: z.string().regex(/^\+[1-9]\d{1,14}$/),
  amount: z
    .number()
    .positive("Amount must be positive")
    .max(1_000_000, "Amount exceeds maximum transaction limit"),
});

// [CVE-7 FIX] escrowId must be a valid UUID — no free-form string
const releaseSchema = z.object({
  escrowId: z
    .string()
    .uuid("escrowId must be a valid UUID"),
});

export default async function (fastify: FastifyInstance) {
  fastify.addHook("preHandler", verifySentraApiKey);

  fastify.post(
    "/escrow/create",
    {
      schema: {
        description: "Create a new escrow transaction",
        tags: ["Escrow"],
        security: [{ apiKey: [] }],
        body: {
          type: "object",
          properties: {
            senderPhone: { type: "string" },
            receiverPhone: { type: "string" },
            amount: { type: "number", minimum: 0.01, maximum: 1000000 },
          },
          required: ["senderPhone", "receiverPhone", "amount"],
        },
      },
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      const body = createSchema.parse(request.body);

      // [SECURITY] senderPhone cannot equal receiverPhone
      if (body.senderPhone === body.receiverPhone) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Sender and receiver cannot be the same",
        });
      }

      // [CVE-7 FIX] Pass the authenticated user as the escrow owner
      const result = await createEscrow({
        ...body,
        ownerId: request.sentraUser.uid,
      });
      return reply.status(201).send(result);
    },
  );

  fastify.post(
    "/escrow/release",
    {
      schema: {
        description: "Release funds from an existing escrow",
        tags: ["Escrow"],
        security: [{ apiKey: [] }],
        body: {
          type: "object",
          properties: {
            escrowId: { type: "string", format: "uuid" },
          },
          required: ["escrowId"],
        },
      },
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      const { escrowId } = releaseSchema.parse(request.body);
      // [CVE-7 FIX] Pass ownerId to ensure only the escrow owner can release it
      const result = await releaseEscrow(escrowId, request.sentraUser.uid);

      if (!result) {
        // [SECURITY] Return 404 not 403 — don't confirm the escrow exists
        return reply.status(404).send({
          error: "Not Found",
          message: "Escrow not found or you do not have permission to release it",
        });
      }

      return result;
    },
  );
}
