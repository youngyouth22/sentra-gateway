import path from "node:path";
import AutoLoad from "@fastify/autoload";
import { fileURLToPath } from "node:url";
import { errorHandler } from "./middleware/errorHandler.js";
// import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
// import swaggerUi from "@fastify/swagger-ui";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Pass --options via CLI arguments in command to enable these options.
const options = {};
export default async function (fastify, opts) {
    // Set custom error handler
    fastify.setErrorHandler(errorHandler);
    // Register Swagger
    await fastify.register(swagger, {
        openapi: {
            openapi: "3.0.0",
            info: {
                title: "SENTRA Trust Scoring API",
                description: "AI-driven Trust Scoring API for fintech fraud prevention",
                version: "1.0.0",
            },
            servers: [
                {
                    url: "http://localhost:3000",
                    description: "Development server",
                },
            ],
            tags: [
                { name: "Trust", description: "Trust scoring endpoints" },
                { name: "Transaction", description: "Transaction management" },
                { name: "Auth", description: "Authentication endpoints" },
                { name: "KYC", description: "Know Your Customer" },
                { name: "Security", description: "Security checks" },
                { name: "Escrow", description: "Escrow services" },
            ],
        },
    });
    // Register Swagger UI
    // await fastify.register(swaggerUi, {
    //   routePrefix: '/docs',
    //   uiConfig: {
    //     docExpansion: 'full',
    //     deepLinking: false
    //   },
    //   staticCSP: true,
    //   transformStaticCSP: (header: string) => header
    // })
    // Register rate limiting
    // await fastify.register(rateLimit, {
    //   max: 100, // requests per window
    //   timeWindow: "1 minute",
    // });
    // Place here your custom code!
    // Do not touch the following lines
    // This loads all plugins defined in plugins
    // those should be support plugins that are reused
    // through your application
    fastify.register(AutoLoad, {
        dir: path.join(__dirname, "plugins"),
        options: Object.assign({}, opts),
    });
    // This loads all plugins defined in routes
    // define your routes in one of these
    fastify.register(AutoLoad, {
        dir: path.join(__dirname, "routes"),
        options: Object.assign({}, opts),
    });
}
export { options };
//# sourceMappingURL=app.js.map