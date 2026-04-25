import Fastify from "fastify";
import app from "./app.js";
import { config } from "./config/index.js";
const server = Fastify({
    logger: {
        level: config.logLevel,
    },
});
server.register(app);
const start = async () => {
    try {
        await server.listen({ port: config.port, host: "0.0.0.0" });
        console.log(`Server listening on http://localhost:${config.port}`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=server.js.map