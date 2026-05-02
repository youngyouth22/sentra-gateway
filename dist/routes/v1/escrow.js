import { z } from "zod";
import { createEscrow, releaseEscrow } from "../../modules/escrow/index.js";
import { verifySentraApiKey } from "../../middleware/auth.js";
import { handleIdempotency, saveIdempotency } from "../../middleware/idempotency.js";
const createSchema = z.object({
    senderPhone: z.string().regex(/^\+[1-9]\d{1,14}$/),
    receiverPhone: z.string().regex(/^\+[1-9]\d{1,14}$/),
    amount: z
        .number()
        .positive("Amount must be positive")
        .max(1_000_000, "Amount exceeds maximum transaction limit"),
});
const releaseSchema = z.object({
    escrowId: z
        .string()
        .uuid("escrowId must be a valid UUID"),
});
export default async function (fastify) {
    fastify.addHook("preHandler", verifySentraApiKey);
    fastify.post("/escrow/create", {
        // [B2B IDEMPOTENCY] Check for duplicate requests before processing
        preHandler: [handleIdempotency],
        schema: {
            description: "Create a new escrow transaction with idempotency support",
            tags: ["Escrow"],
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
                    senderPhone: { type: "string" },
                    receiverPhone: { type: "string" },
                    amount: { type: "number", minimum: 0.01, maximum: 1000000 },
                },
                required: ["senderPhone", "receiverPhone", "amount"],
            },
        },
    }, async function (request, reply) {
        const body = createSchema.parse(request.body);
        if (body.senderPhone === body.receiverPhone) {
            return reply.status(400).send({
                error: "Bad Request",
                message: "Sender and receiver cannot be the same",
            });
        }
        const result = await createEscrow({
            ...body,
            ownerId: request.sentraUser.uid,
        });
        // [B2B IDEMPOTENCY] Save the response for potential future retries
        await saveIdempotency(request, 201, result);
        return reply.status(201).send(result);
    });
    fastify.post("/escrow/release", {
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
    }, async function (request, reply) {
        const { escrowId } = releaseSchema.parse(request.body);
        const result = await releaseEscrow(escrowId, request.sentraUser.uid);
        if (!result) {
            return reply.status(404).send({
                error: "Not Found",
                message: "Escrow not found or you do not have permission to release it",
            });
        }
        return result;
    });
}
//# sourceMappingURL=escrow.js.map