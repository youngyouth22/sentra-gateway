import { z } from "zod";
import { silentVerify, bindDevice } from "../../modules/auth/index.js";
// [CVE-3 FIX] Import authentication — these endpoints were completely unprotected
import { verifySentraApiKey } from "../../middleware/auth.js";
const silentVerifySchema = z.object({
    // [SECURITY] Validate token format to prevent injection
    token: z.string().min(1).max(2048),
});
const deviceBindSchema = z.object({
    // [SECURITY] Limit deviceId length and format
    deviceId: z
        .string()
        .min(1)
        .max(256)
        .regex(/^[a-zA-Z0-9\-_:.]+$/, "Device ID contains invalid characters"),
    phoneNumber: z
        .string()
        .regex(/^\+[1-9]\d{1,14}$/, "Phone number must be in E.164 format (e.g. +33612345678)"),
});
export default async function (fastify) {
    // [CVE-3 FIX] All auth routes now require a valid Sentra API key
    // Without this hook, ANY anonymous request could trigger device binding
    fastify.addHook("preHandler", verifySentraApiKey);
    fastify.post("/auth/silent-verify", {
        schema: {
            description: "Verify phone number silently using network tokens (requires API key)",
            tags: ["Auth"],
            security: [{ apiKey: [] }],
            body: {
                type: "object",
                properties: {
                    token: { type: "string", maxLength: 2048 },
                },
                required: ["token"],
            },
        },
    }, async function (request, reply) {
        const body = silentVerifySchema.parse(request.body);
        const result = await silentVerify({
            ...body,
            ipAddress: request.ip,
            ownerId: request.sentraUser.uid, // Scopes verification to the authenticated API key owner
        });
        return result;
    });
    fastify.post("/auth/device-bind", {
        schema: {
            description: "Bind a device ID to a phone number (requires API key)",
            tags: ["Auth"],
            security: [{ apiKey: [] }],
            body: {
                type: "object",
                properties: {
                    deviceId: { type: "string", maxLength: 256 },
                    phoneNumber: { type: "string" },
                },
                required: ["deviceId", "phoneNumber"],
            },
        },
    }, async function (request, reply) {
        const body = deviceBindSchema.parse(request.body);
        // [SECURITY] The binding is scoped to the authenticated API key user
        const result = await bindDevice({
            ...body,
            // Pass the authenticated userId so bindings are tenant-scoped
            ownerId: request.sentraUser.uid,
        });
        return result;
    });
}
//# sourceMappingURL=auth.js.map