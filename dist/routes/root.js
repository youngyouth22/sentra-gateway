export default async function (fastify, opts) {
    fastify.get("/", async function (request, reply) {
        return { root: true };
    });
    fastify.get("/health", async function (request, reply) {
        return { status: "ok", timestamp: new Date().toISOString() };
    });
}
//# sourceMappingURL=root.js.map