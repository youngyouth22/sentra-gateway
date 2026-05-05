import { z } from "zod";
import crypto from "node:crypto";
import { supabase } from "../../plugins/supabase.js";
import { verifySupabaseToken } from "../../middleware/auth.js";
const registerWebhookSchema = z.object({
    url: z.string().url().startsWith("https://", "Webhook URL must use HTTPS"),
    events: z.array(z.string()).optional(),
});
export default async function (fastify) {
    // Only authenticated users (dashboard/admin) can manage webhooks
    fastify.addHook("preHandler", verifySupabaseToken);
    /**
     * Register a new webhook endpoint
     */
    fastify.post("/webhooks/endpoints", {
        schema: {
            description: "Register a new webhook endpoint for event notifications",
            tags: ["API Management"],
            security: [{ bearerAuth: [] }],
            body: {
                type: "object",
                properties: {
                    url: { type: "string", format: "uri" },
                    events: { type: "array", items: { type: "string" } },
                },
                required: ["url"],
            },
            response: {
                201: {
                    description: "Webhook registered",
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        url: { type: "string" },
                        events: { type: "array", items: { type: "string" } },
                        signing_secret: { type: "string" }
                    }
                },
                400: { $ref: "ErrorResponse#" },
                401: { $ref: "ErrorResponse#" },
                500: { $ref: "ErrorResponse#" }
            }
        },
    }, async function (request, reply) {
        const { url, events } = registerWebhookSchema.parse(request.body);
        // Generate a unique signing secret for this endpoint
        const signingSecret = `whsec_${crypto.randomBytes(32).toString("hex")}`;
        const { data, error } = await supabase
            .from("webhook_endpoints")
            .insert({
            user_id: request.sentraUser.uid,
            url,
            signing_secret: signingSecret,
            events: events || [
                "trust.alert",
                "transaction.blocked",
                "transaction.step_up",
                "escrow.created",
                "escrow.released"
            ],
        })
            .select()
            .single();
        if (error) {
            return reply.status(400).send({ error: "Failed to register webhook", details: error.message });
        }
        return reply.status(201).send(data);
    });
    /**
     * List all configured webhook endpoints
     */
    fastify.get("/webhooks/endpoints", {
        schema: {
            description: "List all webhook endpoints for the authenticated user",
            tags: ["API Management"],
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    description: "List of webhooks",
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            url: { type: "string" },
                            events: { type: "array", items: { type: "string" } }
                        }
                    }
                },
                401: { $ref: "ErrorResponse#" },
                500: { $ref: "ErrorResponse#" }
            }
        },
    }, async function (request, reply) {
        const { data, error } = await supabase
            .from("webhook_endpoints")
            .select("*")
            .eq("user_id", request.sentraUser.uid);
        if (error) {
            return reply.status(500).send({ error: "Failed to fetch webhooks" });
        }
        return data;
    });
    /**
     * Delete/Revoke a webhook endpoint
     */
    fastify.delete("/webhooks/endpoints/:id", {
        schema: {
            description: "Delete a webhook endpoint",
            tags: ["API Management"],
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
                400: { $ref: "ErrorResponse#" },
                401: { $ref: "ErrorResponse#" },
                500: { $ref: "ErrorResponse#" }
            }
        },
    }, async function (request, reply) {
        const { id } = request.params;
        const { error } = await supabase
            .from("webhook_endpoints")
            .delete()
            .eq("id", id)
            .eq("user_id", request.sentraUser.uid);
        if (error) {
            return reply.status(400).send({ error: "Failed to delete webhook" });
        }
        return reply.status(204).send();
    });
}
//# sourceMappingURL=webhooks.js.map