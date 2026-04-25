import fp from "fastify-plugin";
import { config } from "../config/index.js";
export default fp(async function (fastify, opts) {
    fastify.addHook("preHandler", async (request, reply) => {
        const apiKey = request.headers["x-api-key"];
        if (!apiKey || apiKey !== config.apiKey) {
            reply
                .code(401)
                .send({ error: "Unauthorized", message: "Invalid API key" });
            return;
        }
    });
});
//# sourceMappingURL=auth.js.map