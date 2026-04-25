import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { silentVerify, bindDevice } from "../../modules/auth/index.js";

const silentVerifySchema = z.object({
  token: z.string(),
});

const deviceBindSchema = z.object({
  deviceId: z.string(),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/),
});

export default async function (fastify: FastifyInstance) {
  fastify.post(
    "/auth/silent-verify",
    {
      schema: {
        description: "Verify phone number silently using network tokens",
        tags: ["Auth"],
        body: {
          type: "object",
          properties: {
            token: { type: "string" },
          },
          required: ["token"],
        },
      },
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      const body = silentVerifySchema.parse(request.body);
      const result = await silentVerify(body);
      return result;
    },
  );

  fastify.post(
    "/auth/device-bind",
    {
      schema: {
        description: "Bind a device ID to a phone number for future authentication",
        tags: ["Auth"],
        body: {
          type: "object",
          properties: {
            deviceId: { type: "string" },
            phoneNumber: { type: "string" },
          },
          required: ["deviceId", "phoneNumber"],
        },
      },
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      const body = deviceBindSchema.parse(request.body);
      const result = await bindDevice(body);
      return result;
    },
  );
}
