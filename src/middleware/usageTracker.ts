
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../modules/db/index.js";

export function usageTracker(fastify: FastifyInstance) {
  fastify.addHook("onResponse", async (request: FastifyRequest, reply: FastifyReply) => {
    // Only log if we have a user/apiKey context (i.e., it's a protected endpoint)
    if (!request.user || !request.apiKeyId) {
      return;
    }

    const log = {
      apiKeyId: request.apiKeyId,
      userId: request.user.uid,
      endpoint: request.url.split('?')[0],
      method: request.method,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime, // Requires 'reply.elapsedTime' which is available if 'fastify.addHook("onResponse")' is used with performance tracking
      timestamp: new Date(),
    };

    // Non-blocking save
    db.logUsage(log).catch(err => {
      fastify.log.error("Failed to log API usage:", err);
    });
  });
}
