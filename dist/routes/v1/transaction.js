import { z } from "zod";
import { initiateTransaction } from "../../modules/transaction/index.js";
const initiateSchema = z.object({
    phoneNumber: z
        .string()
        .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
    amount: z.number().positive("Amount must be positive"),
});
export default async function (fastify, opts) {
    fastify.post("/transaction/initiate", {
        schema: {
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
                    type: "object",
                    properties: {
                        transactionId: { type: "string" },
                        approved: { type: "boolean" },
                        trustScore: { type: "number" },
                        riskLevel: { type: "string", enum: ["low", "medium", "high"] },
                        decision: {
                            type: "string",
                            enum: ["ALLOW", "STEP_UP_AUTH", "BLOCK"],
                        },
                        signals: {
                            type: "object",
                            properties: {
                                simSwap: { type: "boolean" },
                                deviceChanged: { type: "boolean" },
                                roaming: { type: "boolean" },
                            },
                        },
                        reasons: { type: "array", items: { type: "string" } },
                    },
                },
            },
        },
    }, async function (request, reply) {
        const body = initiateSchema.parse(request.body);
        const result = await initiateTransaction(body);
        return result;
    });
}
//# sourceMappingURL=transaction.js.map