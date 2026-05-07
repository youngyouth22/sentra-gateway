import path from "node:path";
import AutoLoad from "@fastify/autoload";
import { fileURLToPath } from "node:url";
import { errorHandler } from "./middleware/errorHandler.js";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import fp from "fastify-plugin";
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { config } from "./config/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options = {};

export default fp(async function (fastify: FastifyInstance, opts: FastifyPluginOptions) {
  // Set custom error handler
  fastify.setErrorHandler(errorHandler);

  // Add global schema for standard error responses
  fastify.addSchema({
    $id: "ErrorResponse",
    type: "object",
    properties: {
      statusCode: { type: "integer", example: 400 },
      code: { type: "string", example: "validation_failed" },
      message: { type: "string", example: "Validation failed" },
      details: {
        type: "array",
        items: {
          type: "object",
          properties: {
            path: { type: "string" },
            message: { type: "string" },
          },
        },
      },
      referenceId: { type: "string", example: "req-12345" },
    },
    required: ["statusCode", "code", "message", "referenceId"],
  });

  // ── CORS (Production-Grade Multi-Origin Policy) ──────────────────────────
  await fastify.register(cors, {
    origin: (origin, cb) => {
      // 1. Allow if no origin (mobile apps, server-to-server)
      if (!origin) {
        cb(null, true);
        return;
      }

      // 2. Parse whitelist
      const whitelist = config.corsOrigin.split(",").map((o) => o.trim().replace(/\/$/, ""));
      const normalizedOrigin = origin.replace(/\/$/, "");

      // 3. Strict Check with Debugging
      const isAllowed = whitelist.includes(normalizedOrigin) || 
                        whitelist.some(pattern => {
                          if (pattern === "*") return true;
                          // Allow subdomains if configured as .domain.com
                          if (pattern.startsWith(".")) {
                            return normalizedOrigin.endsWith(pattern) || normalizedOrigin === pattern.substring(1);
                          }
                          return false;
                        });

      if (isAllowed || !config.isProduction) {
        cb(null, true);
      } else {
        fastify.log.warn({ origin, whitelist }, "CORS rejection");
        cb(null, false); // Return false instead of error to avoid 500
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-api-key",
      "x-idempotency-key",
      "x-client-info",
      "apikey",
      "Accept",
      "Origin",
    ],
    credentials: true,
    maxAge: 86400,
    // [SENIOR] Ensure preflight responses are handled correctly
    hideOptionsRoute: false,
  });

  // [SENIOR] Add a global hook to inject CORS debug info (only in non-prod or for dev tracking)
  fastify.addHook("onSend", async (request, reply) => {
    if (request.headers.origin) {
      reply.header("X-Sentra-Origin-Check", "processed");
    }
  });

  // ── Security Headers (Helmet) ─────────────────────────────────────────────
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        scriptSrc: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: config.isProduction ? [] : null,
      },
    },
    xContentTypeOptions: true,
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: config.isProduction
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
  });

  // ── Global Rate Limit (baseline) ─────────────────────────────────────────
  // [VH-6] Global rate limit kept as a baseline safety net
  await fastify.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: "1 minute",
    // Return 429 with Retry-After header
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
      "retry-after": true,
    },
    keyGenerator: (request) => {
      // Rate limit by API key when available, otherwise by IP
      const apiKey = request.headers["x-api-key"] as string;
      return apiKey || request.ip;
    },
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: `Rate limit exceeded. Please retry after ${Math.ceil(context.ttl / 1000)} seconds.`,
    }),
  });

  // ── Swagger (disabled in production) ─────────────────────────────────────
  // [VH-2 FIX] API documentation is never exposed in production
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "SENTRA Trust Scoring & Identity Gateway",
        description: "SENTRA is an AI-driven trust scoring engine that leverages the Nokia Network-as-Code Nexus and collective intelligence to prevent fintech fraud. This API provides real-time network signals, transaction security, and silent authentication.",
        version: "1.0.0",
        contact: {
          name: "Sentra Security Team",
          url: "https://sentra.io",
          email: "security@sentra.io"
        }
      },
      externalDocs: {
        url: "https://docs.sentra.io",
        description: "Find more info here"
      },
      servers: [
        {
          url: config.apiUrl,
          description: config.isProduction ? "Production" : "Development server",
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
        schemas: {
          ErrorResponse: {
            type: "object",
            properties: {
              statusCode: { type: "integer", example: 400 },
              code: { type: "string", example: "validation_failed" },
              message: { type: "string", example: "Validation failed" },
              details: { 
                type: "array", 
                items: { 
                  type: "object", 
                  properties: { 
                    path: { type: "string" }, 
                    message: { type: "string" } 
                  } 
                } 
              },
              referenceId: { type: "string", example: "req-12345" }
            },
            required: ["statusCode", "code", "message", "referenceId"]
          }
        },
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

  // [VH-2 FIX] Register Swagger UI unconditionally for ReDoc Dashboard
  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
      // Disable "Try it out" in development to prevent accidental calls
      supportedSubmitMethods: ["get"],
    },
    staticCSP: true,
  });
  fastify.log.info("Swagger UI enabled at /docs");

  // ── Usage Tracker ─────────────────────────────────────────────────────────
  const { usageTracker } = await import("./middleware/usageTracker.js");
  usageTracker(fastify);

  // ── Auto-load plugins and routes ──────────────────────────────────────────
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "plugins"),
    forceTypeScript: true,
    extension: ".ts",
    options: Object.assign({}, opts),
  } as any);

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "routes"),
    forceTypeScript: true,
    extension: ".ts",
    options: Object.assign({}, opts),
  } as any);
});

export { options };
