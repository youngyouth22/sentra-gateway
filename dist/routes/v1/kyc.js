import { z } from "zod";
const checkSchema = z.object({
    userId: z.string(),
});
const autoFillSchema = z.object({
    userId: z.string(),
});
export default async function (fastify, opts) {
    fastify.post("/kyc/check", {
        schema: {
            body: {
                type: "object",
                properties: {
                    userId: { type: "string" },
                },
                required: ["userId"],
            },
        },
    }, async function (request, reply) {
        const { userId } = checkSchema.parse(request.body);
        // Implement KYC check
        return { eligible: true, status: "approved" };
    });
    fastify.get("/kyc/auto-fill", {
        schema: {
            querystring: {
                type: "object",
                properties: {
                    userId: { type: "string" },
                },
                required: ["userId"],
            },
        },
    }, async function (request, reply) {
        const { userId } = autoFillSchema.parse(request.query);
        // Implement auto-fill
        return {
            name: "John Doe",
            address: "123 Main St",
            dob: "1990-01-01",
        };
    });
}
//# sourceMappingURL=kyc.js.map