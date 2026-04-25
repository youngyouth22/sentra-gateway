import { z } from "zod";
import { triggerEscrowCreated, triggerEscrowReleased, } from "../../utils/webhookDispatcher.js";
const createSchema = z.object({
    amount: z.number().positive(),
    buyerId: z.string(),
    sellerId: z.string(),
});
const releaseSchema = z.object({
    escrowId: z.string(),
});
export default async function (fastify, opts) {
    fastify.post("/escrow/create", {
        schema: {
            body: {
                type: "object",
                properties: {
                    amount: { type: "number" },
                    buyerId: { type: "string" },
                    sellerId: { type: "string" },
                },
                required: ["amount", "buyerId", "sellerId"],
            },
        },
    }, async function (request, reply) {
        const body = createSchema.parse(request.body);
        // Implement escrow creation
        const escrowId = `esc_${Date.now()}`;
        const result = { escrowId, status: "created", amount: body.amount };
        // Trigger webhook
        triggerEscrowCreated(result);
        return result;
    });
    fastify.post("/escrow/release", {
        schema: {
            body: {
                type: "object",
                properties: {
                    escrowId: { type: "string" },
                },
                required: ["escrowId"],
            },
        },
    }, async function (request, reply) {
        const { escrowId } = releaseSchema.parse(request.body);
        // Implement escrow release
        const result = { escrowId, status: "released" };
        // Trigger webhook
        triggerEscrowReleased(result);
        return result;
    });
}
//# sourceMappingURL=escrow.js.map