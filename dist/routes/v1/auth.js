import { z } from "zod";
const silentVerifySchema = z.object({
    token: z.string(),
});
const deviceBindSchema = z.object({
    deviceId: z.string(),
    phoneNumber: z.string(),
});
export default async function (fastify, opts) {
    fastify.post("/auth/silent-verify", {
        schema: {
            body: {
                type: "object",
                properties: {
                    token: { type: "string" },
                },
                required: ["token"],
            },
        },
    }, async function (request, reply) {
        const { token } = silentVerifySchema.parse(request.body);
        // Implement verification logic
        return { success: true, verified: true };
    });
    fastify.post("/auth/device-bind", {
        schema: {
            body: {
                type: "object",
                properties: {
                    deviceId: { type: "string" },
                    phoneNumber: { type: "string" },
                },
                required: ["deviceId", "phoneNumber"],
            },
        },
    }, async function (request, reply) {
        const body = deviceBindSchema.parse(request.body);
        // Implement binding logic
        return { success: true, bound: true };
    });
}
//# sourceMappingURL=auth.js.map