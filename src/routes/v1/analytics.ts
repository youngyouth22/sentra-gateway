
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../modules/db/index.js";
import { verifySupabaseToken } from "../../middleware/auth.js";

export default async function (fastify: FastifyInstance) {
  fastify.addHook("preHandler", verifySupabaseToken);

  fastify.get(
    "/analytics/usage",
    {
      schema: {
        description: "Get general API usage statistics",
        tags: ["Analytics"],
        security: [{ bearerAuth: [] }],
      },
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      const logs = await db.getUsageByUser(request.sentraUser.uid);
      
      const totalRequests = logs.length;
      if (totalRequests === 0) {
        return {
          totalRequests: 0,
          successRate: 0,
          errorRate: 0,
          avgResponseTime: 0,
        };
      }

      const successes = logs.filter(l => l.statusCode >= 200 && l.statusCode < 300).length;
      const errors = totalRequests - successes;
      const totalResponseTime = logs.reduce((acc, l) => acc + l.responseTime, 0);

      return {
        totalRequests,
        successRate: (successes / totalRequests) * 100,
        errorRate: (errors / totalRequests) * 100,
        avgResponseTime: totalResponseTime / totalRequests,
      };
    },
  );

  fastify.get(
    "/analytics/usage-by-endpoint",
    {
      schema: {
        description: "Get API usage grouped by endpoint",
        tags: ["Analytics"],
        security: [{ bearerAuth: [] }],
      },
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      const logs = await db.getUsageByUser(request.sentraUser.uid);
      
      const grouped = logs.reduce((acc: Record<string, number>, log) => {
        const key = `${log.method} ${log.endpoint}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(grouped).map(([endpoint, count]) => ({
        endpoint,
        count,
      }));
    },
  );

  fastify.get(
    "/analytics/daily-usage",
    {
      schema: {
        description: "Get daily API usage for the last 7 days",
        tags: ["Analytics"],
        security: [{ bearerAuth: [] }],
      },
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      const logs = await db.getUsageByUser(request.sentraUser.uid);
      
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      const stats = last7Days.map(date => {
        const count = logs.filter(l => l.timestamp.toISOString().split('T')[0] === date).length;
        return { date, count };
      });

      return stats;
    },
  );
}
