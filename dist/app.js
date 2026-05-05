import path from "node:path";
import AutoLoad from "@fastify/autoload";
import { fileURLToPath } from "node:url";
import { errorHandler } from "./middleware/errorHandler.js";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { config } from "./config/index.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const options = {};
export default async function (fastify, opts) {
    // Set custom error handler
    fastify.setErrorHandler(errorHandler);
    // Add global schema for standard error responses so AJV can resolve $ref: "ErrorResponse#"
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
    // ── Security Headers (Helmet) ─────────────────────────────────────────────
    // [VH-1] Fixed: removed 'unsafe-inline' from scriptSrc
    await fastify.register(helmet, {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'"],
                imgSrc: ["'self'", "data:"],
                // [VH-1 FIX] Removed "https: 'unsafe-inline'" — was allowing XSS
                scriptSrc: ["'self'"],
                frameAncestors: ["'none'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: config.isProduction ? [] : null,
            },
        },
        // Prevent MIME type sniffing
        xContentTypeOptions: true,
        // Prevent iframe embedding (clickjacking)
        frameguard: { action: "deny" },
        // Remove X-Powered-By header
        hidePoweredBy: true,
        // HSTS in production
        hsts: config.isProduction
            ? { maxAge: 31536000, includeSubDomains: true, preload: true }
            : false,
    });
    // ── CORS ──────────────────────────────────────────────────────────────────
    // [VM-2 FIX] Explicit CORS policy — rejects requests from unauthorized origins
    await fastify.register(cors, {
        origin: config.isProduction
            ? config.corsOrigin.split(",").map((o) => o.trim())
            : true, // In dev, allow all origins for convenience
        methods: ["GET", "POST", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "x-idempotency-key"],
        credentials: true,
        maxAge: 86400, // 24h preflight cache
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
            const apiKey = request.headers["x-api-key"];
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
    // [VH-2 FIX] Only register Swagger UI in non-production environments
    if (!config.isProduction) {
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
        fastify.log.info("Swagger UI enabled at /docs (non-production only)");
    }
    // ── Usage Tracker ─────────────────────────────────────────────────────────
    const { usageTracker } = await import("./middleware/usageTracker.js");
    usageTracker(fastify);
    // ── Auto-load plugins and routes ──────────────────────────────────────────
    fastify.register(AutoLoad, {
        dir: path.join(__dirname, "plugins"),
        forceTypeScript: true,
        extension: ".ts",
        options: Object.assign({}, opts),
    });
    fastify.register(AutoLoad, {
        dir: path.join(__dirname, "routes"),
        forceTypeScript: true,
        extension: ".ts",
        options: Object.assign({}, opts),
    });
}
export { options };
//# sourceMappingURL=app.js.map