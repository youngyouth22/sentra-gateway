import { z } from "zod";
import { createApiKeyForUser, listUserApiKeys, revokeApiKey } from "../../modules/auth/apiKey.js";
import { verifySupabaseToken } from "../../middleware/auth.js";
const createKeySchema = z.object({
    name: z.string().min(1).max(50),
});
export default async function (fastify) {
    // Key management requires a Supabase User Session (Dashboard)
    fastify.addHook("preHandler", verifySupabaseToken);
    /**
     * Create a new API key
     */
    fastify.post("/keys", {
        schema: {
            description: "Create a new programmatic API key",
            tags: ["Key Management"],
            security: [{ bearerAuth: [] }],
            body: {
                type: "object",
                properties: {
                    name: { type: "string", maxLength: 50 },
                },
                required: ["name"],
            },
            response: {
                201: {
                    description: "API key created",
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        rawKey: { type: "string" },
                        createdAt: { type: "string" }
                    }
                },
                400: { $ref: "ErrorResponse#" },
                401: { $ref: "ErrorResponse#" },
                500: { $ref: "ErrorResponse#" }
            }
        },
    }, async function (request, reply) {
        const { name } = createKeySchema.parse(request.body);
        const result = await createApiKeyForUser(request.sentraUser.uid, name);
        // We return the rawKey only ONCE. It is never stored in plaintext.
        return reply.status(201).send(result);
    });
    /**
     * List all API keys for the current user
     */
    fastify.get("/keys", {
        schema: {
            description: "List all active API keys",
            tags: ["Key Management"],
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    description: "List of API keys",
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            createdAt: { type: "string" },
                            lastUsedAt: { type: "string", nullable: true }
                        }
                    }
                },
                401: { $ref: "ErrorResponse#" },
                500: { $ref: "ErrorResponse#" }
            }
        },
    }, async function (request, reply) {
        const keys = await listUserApiKeys(request.sentraUser.uid);
        return keys;
    });
    /**
     * Revoke an API key
     */
    fastify.delete("/keys/:id", {
        schema: {
            description: "Revoke an API key",
            tags: ["Key Management"],
            security: [{ bearerAuth: [] }],
            params: {
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid" },
                },
                required: ["id"],
            },
            response: {
                204: { type: "null" },
                401: { $ref: "ErrorResponse#" },
                404: { $ref: "ErrorResponse#" },
                500: { $ref: "ErrorResponse#" }
            }
        },
    }, async function (request, reply) {
        const { id } = request.params;
        const success = await revokeApiKey(id, request.sentraUser.uid);
        if (!success) {
            return reply.status(404).send({ error: "Key not found" });
        }
        return reply.status(204).send();
    });
}
//# sourceMappingURL=keys.js.map