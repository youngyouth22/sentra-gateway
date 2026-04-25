import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { preAuthCheck, checkGeofence } from "../../modules/security/index.js";

const preAuthSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  transactionAmount: z.number().optional(),
});

const geofenceSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  latitude: z.number(),
  longitude: z.number(),
  radius: z.number().default(1000),
});

import { verifySentraApiKey } from "../../middleware/auth.js";

export default async function (fastify: FastifyInstance) {
  fastify.addHook("preHandler", verifySentraApiKey);
  fastify.post(
    "/security/pre-auth-check",
    {
      schema: {
        description: "Perform security risk assessment before authorizing an action",
        tags: ["Security"],
        body: {
          type: "object",
          properties: {
            phoneNumber: { type: "string" },
            transactionAmount: { type: "number" },
          },
          required: ["phoneNumber"],
        },
      },
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      const body = preAuthSchema.parse(request.body);
      const result = await preAuthCheck(body);
      return result;
    },
  );

  fastify.post(
    "/security/geofence",
    {
      schema: {
        description: "Verify if a device is within a specific geographic area",
        tags: ["Security"],
        body: {
          type: "object",
          properties: {
            phoneNumber: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" },
            radius: { type: "number" },
          },
          required: ["phoneNumber", "latitude", "longitude"],
        },
      },
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      const body = geofenceSchema.parse(request.body);
      const result = await checkGeofence(body);
      return result;
    },
  );
}
