import { z } from "zod";
import { createApiKeyForUser, listUserApiKeys, revokeApiKey } from "../../modules/auth/apiKey.js";
import { verifySupabaseToken } from "../../middleware/auth.js";
const createKeySchema = z.object({
    name: z.string().min(1).max(50),
});
export default async function (fastify) {
    // Apply Supabase Auth to all routes in this file
    fastify.addHook("preHandler", verifySupabaseToken);
    fastify.post("/api-keys", {
        schema: {
            description: "Generate a new API key",
            tags: ["API Management"],
            security: [{ bearerAuth: [] }],
            body: {
                type: "object",
                properties: {
                    name: { type: "string" },
                },
                required: ["name"],
            },
            response: {
                201: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        rawKey: { type: "string" },
                        createdAt: { type: "string" },
                    },
                },
            },
        },
    }, async function (request, reply) {
        const { name } = createKeySchema.parse(request.body);
        const result = await createApiKeyForUser(request.sentraUser.uid, name);
        return reply.status(201).send(result);
    });
    fastify.get("/api-keys", {
        schema: {
            description: "List all API keys for the authenticated user",
            tags: ["API Management"],
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            createdAt: { type: "string" },
                            lastUsedAt: { type: "string", nullable: true },
                        },
                    },
                },
            },
        },
    }, async function (request, reply) {
        const keys = await listUserApiKeys(request.sentraUser.uid);
        return keys;
    });
    fastify.delete("/api-keys/:id", {
        schema: {
            description: "Revoke an API key",
            tags: ["API Management"],
            security: [{ bearerAuth: [] }],
            params: {
                type: "object",
                properties: {
                    id: { type: "string" },
                },
                required: ["id"],
            },
            response: {
                204: { type: "null" },
            },
        },
    }, async function (request, reply) {
        const { id } = request.params;
        const success = await revokeApiKey(id, request.sentraUser.uid);
        if (!success) {
            return reply.status(404).send({ error: "API key not found" });
        }
        return reply.status(204).send();
    });
}
//# sourceMappingURL=api-keys.js.map