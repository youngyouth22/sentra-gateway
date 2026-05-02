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