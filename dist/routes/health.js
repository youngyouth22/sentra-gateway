export default async function (fastify) {
    fastify.get("/health", {
        schema: {
            description: "Check API health and status",
            tags: ["System"],
            response: {
                200: {
                    type: "object",
                    properties: {
                        status: { type: "string" },
                        environment: { type: "string" },
                        uptime: { type: "number" },
                        timestamp: { type: "string" },
                    },
                },
            },
        },
        handler: async (request, reply) => {
            return {
                status: "secure",
                environment: process.env.NODE_ENV || "development",
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
            };
        },
    });
}
//# sourceMappingURL=health.js.map