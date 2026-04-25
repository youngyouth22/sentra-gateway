import { z } from "zod";
const preAuthSchema = z.object({
    userId: z.string(),
    action: z.string(),
});
const geofenceSchema = z.object({
    latitude: z.number(),
    longitude: z.number(),
});
export default async function (fastify, opts) {
    fastify.post("/security/pre-auth-check", {
        schema: {
            body: {
                type: "object",
                properties: {
                    userId: { type: "string" },
                    action: { type: "string" },
                },
                required: ["userId", "action"],
            },
        },
    }, async function (request, reply) {
        const body = preAuthSchema.parse(request.body);
        // Implement pre-auth check
        return { allowed: true, risk: "low" };
    });
    fastify.post("/security/geofence", {
        schema: {
            body: {
                type: "object",
                properties: {
                    latitude: { type: "number" },
                    longitude: { type: "number" },
                },
                required: ["latitude", "longitude"],
            },
        },
    }, async function (request, reply) {
        const body = geofenceSchema.parse(request.body);
        // Implement geofence check
        return { inside: true, zone: "safe" };
    });
}
//# sourceMappingURL=security.js.map