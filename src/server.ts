import Fastify from "fastify";
import app from "./app.js";
import { config } from "./config/index.js";
import { randomUUID } from "node:crypto";

const server = Fastify({
  logger: {
    level: config.logLevel,
    // [VF-1 FIX] Redact sensitive fields from logs globally
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers[\"x-api-key\"]",
        "*.phoneNumber",
        "*.phone_number",
        "*.password",
        "*.token",
        "*.rawKey",
      ],
      censor: "[REDACTED]",
    },
  },
  // [VF-2 FIX] Unique request ID for distributed tracing
  genReqId: () => randomUUID(),
  // [VH-5 FIX] Limit request body to 1MB to prevent DoS via large payloads
  bodyLimit: config.bodyLimit,
  // Trust the first proxy hop (important for real IP behind reverse proxy)
  trustProxy: config.isProduction ? 1 : false,
  // Disable X-Powered-By header (Fastify doesn't set it, but being explicit)
  disableRequestLogging: false,
});

server.register(app);

const start = async () => {
  try {
    // [VF-3] In production, bind to 0.0.0.0 but ensure TLS is terminated upstream
    await server.listen({ port: config.port, host: "0.0.0.0" });
    if (!config.isProduction) {
      console.log(`Server listening on http://localhost:${config.port}`);
    }
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
