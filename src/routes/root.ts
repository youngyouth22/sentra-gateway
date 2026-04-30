export default async function (fastify: any, opts: any) {
  fastify.get("/", async function (request: any, reply: any) {
    return { 
      name: "SENTRA Trust Scoring API",
      status: "operational",
      version: "1.0.0" 
    };
  });
}
