import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../modules/db/index.js";
import { verifySupabaseToken } from "../../middleware/auth.js";

export default async function (fastify: FastifyInstance) {
  // Analytics require a Supabase User Session (Dashboard access)
  fastify.addHook("preHandler", verifySupabaseToken);

  /**
   * Get usage summary for the current user
   */
  fastify.get(
    "/analytics/usage",
    {
      schema: {
        description: "Get API usage analytics and billing summary",
        tags: ["Analytics"],
        security: [{ bearerAuth: [] }],
      },
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      const logs = await db.getUsageByUser(request.sentraUser.uid);
      
      // Compute summary
      const summary = {
        totalRequests: logs.length,
        successCount: logs.filter(l => l.statusCode >= 200 && l.statusCode < 300).length,
        errorCount: logs.filter(l => l.statusCode >= 400).length,
        avgResponseTime: logs.length > 0 
          ? Math.round(logs.reduce((acc, l) => acc + l.responseTime, 0) / logs.length) 
          : 0,
        requestsByEndpoint: logs.reduce((acc: Record<string, number>, l) => {
          acc[l.endpoint] = (acc[l.endpoint] || 0) + 1;
          return acc;
        }, {}),
        lastRequests: logs.slice(0, 10)
      };

      return summary;
    },
  );
}
