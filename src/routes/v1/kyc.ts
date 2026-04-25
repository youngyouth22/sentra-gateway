import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { checkKYC, autoFillKYC } from "../../modules/kyc/index.js";
import { verifySentraApiKey } from "../../middleware/auth.js";

const checkSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  idNumber: z.string().optional(),
  fullName: z.string().optional(),
});

const autoFillSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/),
});

export default async function (fastify: FastifyInstance) {
  fastify.addHook("preHandler", verifySentraApiKey);

  fastify.post(
    "/kyc/check",
    {
      schema: {
        description: "Verify identity using network-provided KYC data",
        tags: ["KYC"],
        body: {
          type: "object",
          properties: {
            phoneNumber: { type: "string" },
            idNumber: { type: "string" },
            fullName: { type: "string" },
          },
          required: ["phoneNumber"],
        },
      },
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      const body = checkSchema.parse(request.body);
      const result = await checkKYC(body);
      return result;
    },
  );

  fastify.get(
    "/kyc/auto-fill",
    {
      schema: {
        description: "Automatically retrieve user profile data from network operator",
        tags: ["KYC"],
        querystring: {
          type: "object",
          properties: {
            phoneNumber: { type: "string" },
          },
          required: ["phoneNumber"],
        },
      },
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      const { phoneNumber } = autoFillSchema.parse(request.query);
      const result = await autoFillKYC(phoneNumber);
      return result;
    },
  );
}
