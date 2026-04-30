import Fastify from "fastify";
import app from "./app.js";
import { config } from "./config/index.js";
import { randomUUID } from "node:crypto";

const server = Fastify({
  logger: {
    level: config.logLevel,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers['x-api-key']",
        "*.phoneNumber",
        "*.phone_number",
        "*.password",
        "*.token",
        "*.rawKey",
      ],
      censor: "[REDACTED]",
    },
  },
  genReqId: () => randomUUID(),
  bodyLimit: config.bodyLimit,
  trustProxy: config.isProduction ? 1 : false,
});

server.register(app);

// ── Graceful Shutdown ──────────────────────────────────────────────────────
// [B2B STABILITY] Ensure the server finishes processing requests before stopping.
const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
for (const signal of signals) {
  process.on(signal, async () => {
    server.log.info(`Received ${signal}, shutting down gracefully...`);
    try {
      // Close the server (stops accepting new connections)
      await server.close();
      server.log.info("Graceful shutdown complete.");
      process.exit(0);
    } catch (err) {
      server.log.error(err, "Error during graceful shutdown");
      process.exit(1);
    }
  });
}

const start = async () => {
  try {
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
