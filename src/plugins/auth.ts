
import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import { config } from "../config/index.js";
import { FastifyInstance } from "fastify";

export default fp(async function (fastify: FastifyInstance, opts: any) {
  // Register JWT
  await fastify.register(jwt, {
    secret: config.jwtSecret,
  });

  // Note: Global hook removed in favor of the new multi-tenant Auth system
  // which uses Firebase and dynamic API Keys.
});
