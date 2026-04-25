import path from "node:path";
import AutoLoad from "@fastify/autoload";
import { fileURLToPath } from "node:url";
import { errorHandler } from "./middleware/errorHandler.js";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { FastifyInstance, FastifyPluginOptions } from "fastify";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pass --options via CLI arguments in command to enable these options.
const options = {};

export default async function (fastify: FastifyInstance, opts: FastifyPluginOptions) {
  // Set custom error handler
  fastify.setErrorHandler(errorHandler);

  // Register Security Plugins
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "validator.swagger.io"],
        scriptSrc: ["'self'", "https: 'unsafe-inline'"],
      },
    },
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

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
        { name: "API Management", description: "API Key management" },
        { name: "Analytics", description: "Usage analytics" },
      ],
      components: {
        securitySchemes: {
          apiKey: {
            type: "apiKey",
            name: "x-api-key",
            in: "header",
          },
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  // Register Usage Tracker
  const { usageTracker } = await import("./middleware/usageTracker.js");
  usageTracker(fastify);

  // Register Swagger UI
  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: (header: string) => header,
  });

  // This loads all plugins defined in plugins
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "plugins"),
    forceTypeScript: true,
    extension: ".ts",
    options: Object.assign({}, opts),
  } as any);

  // This loads all plugins defined in routes
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "routes"),
    forceTypeScript: true,
    extension: ".ts",
    options: Object.assign({}, opts),
  } as any);
}

export { options };

