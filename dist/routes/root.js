export default async function (fastify, opts) {
    fastify.get("/", async function (request, reply) {
        return {
            name: "SENTRA Trust Scoring API",
            status: "operational",
            version: "1.0.0"
        };
    });
}
//# sourceMappingURL=root.js.map