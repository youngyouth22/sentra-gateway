export default async function (fastify: any, opts: any) {
  fastify.get("/", async function (request: any, reply: any) {
    return { root: true };
  });

  fastify.get("/health", async function (request: any, reply: any) {
    return { status: "ok", timestamp: new Date().toISOString() };
  });
}
