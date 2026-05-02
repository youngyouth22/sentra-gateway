import { z } from "zod";
import { preAuthCheck, checkGeofence } from "../../modules/security/index.js";
import { verifySentraApiKey } from "../../middleware/auth.js";
const preAuthSchema = z.object({
    phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/),
    transactionAmount: z
        .number()
        .positive()
        .max(10_000_000)
        .optional(),
});
const geofenceSchema = z.object({
    phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/),
    // [SECURITY] Validate coordinate ranges
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    // [SECURITY] Cap radius to prevent overly broad geofence queries
    radius: z.number().min(100).max(50_000).default(1000),
});
export default async function (fastify) {
    fastify.addHook("preHandler", verifySentraApiKey);
    fastify.post("/security/pre-auth-check", {
        schema: {
            description: "Perform security risk assessment before authorizing an action",
            tags: ["Security"],
            security: [{ apiKey: [] }],
            body: {
                type: "object",
                properties: {
                    phoneNumber: { type: "string" },
                    transactionAmount: { type: "number" },
                },
                required: ["phoneNumber"],
            },
        },
    }, async function (request, reply) {
        const body = preAuthSchema.parse(request.body);
        const result = await preAuthCheck(body, request.sentraUser.uid);
        return result;
    });
    fastify.post("/security/geofence", {
        schema: {
            description: "Verify if a device is within a specific geographic area",
            tags: ["Security"],
            security: [{ apiKey: [] }],
            body: {
                type: "object",
                properties: {
                    phoneNumber: { type: "string" },
                    latitude: { type: "number", minimum: -90, maximum: 90 },
                    longitude: { type: "number", minimum: -180, maximum: 180 },
                    radius: { type: "number", minimum: 100, maximum: 50000 },
                },
                required: ["phoneNumber", "latitude", "longitude"],
            },
        },
    }, async function (request, reply) {
        const body = geofenceSchema.parse(request.body);
        const result = await checkGeofence(body);
        // [VM-6 FIX] Sanitize internal error messages — never expose raw exception details
        if (result.error) {
            request.log.warn({ err: result.error }, "Geofence check failed");
            return reply.status(200).send({
                withinArea: false,
                distanceFromCenter: -1,
                error: "Location data unavailable",
            });
        }
        return result;
    });
}
//# sourceMappingURL=security.js.map