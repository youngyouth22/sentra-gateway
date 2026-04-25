import { z } from "zod";
import { evaluateTrust } from "../../modules/trust/index.js";
const evaluateSchema = z.object({
    phoneNumber: z
        .string()
        .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
});
export default async function (fastify, opts) {
    fastify.post("/trust/evaluate", {
        schema: {
            body: {
                type: "object",
                properties: {
                    phoneNumber: { type: "string" },
                },
                required: ["phoneNumber"],
            },
            response: {
                200: {
                    type: "object",
                    properties: {
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
        const { phoneNumber } = evaluateSchema.parse(request.body);
        const result = await evaluateTrust(phoneNumber);
        return result;
    });
}
//# sourceMappingURL=trust.js.map