import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import crypto from "node:crypto";
import { supabase } from "../../plugins/supabase.js";
import { verifySupabaseToken } from "../../middleware/auth.js";

const registerWebhookSchema = z.object({
  url: z.string().url().startsWith("https://", "Webhook URL must use HTTPS"),
  events: z.array(z.string()).optional(),
});

export default async function (fastify: FastifyInstance) {
  // Only authenticated users (dashboard/admin) can manage webhooks
  fastify.addHook("preHandler", verifySupabaseToken);

  /**
   * Register a new webhook endpoint
   */
  fastify.post(
    "/webhooks/endpoints",
    {
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
      },
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
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
    },
  );

  /**
   * List all configured webhook endpoints
   */
  fastify.get(
    "/webhooks/endpoints",
    {
      schema: {
        description: "List all webhook endpoints for the authenticated user",
        tags: ["API Management"],
        security: [{ bearerAuth: [] }],
      },
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      const { data, error } = await supabase
        .from("webhook_endpoints")
        .select("*")
        .eq("user_id", request.sentraUser.uid);

      if (error) {
        return reply.status(500).send({ error: "Failed to fetch webhooks" });
      }

      return data;
    },
  );

  /**
   * Delete/Revoke a webhook endpoint
   */
  fastify.delete(
    "/webhooks/endpoints/:id",
    {
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
      },
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string };

      const { error } = await supabase
        .from("webhook_endpoints")
        .delete()
        .eq("id", id)
        .eq("user_id", request.sentraUser.uid);

      if (error) {
        return reply.status(400).send({ error: "Failed to delete webhook" });
      }

      return reply.status(204).send();
    },
  );
}
