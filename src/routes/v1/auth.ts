import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { initSilentVerify, silentVerify, bindDevice } from "../../modules/auth/index.js";
// [CVE-3 FIX] Import authentication — these endpoints were completely unprotected
import { verifySentraApiKey } from "../../middleware/auth.js";

const initSilentVerifySchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, "Phone number must be in E.164 format (e.g. +33612345678)"),
  redirectUri: z.string().url("Must be a valid URL"),
});

const verifySilentVerifySchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, "Phone number must be in E.164 format (e.g. +33612345678)"),
  code: z.string().min(1),
  state: z.string().min(1),
});

const deviceBindSchema = z.object({
  // [SECURITY] Limit deviceId length and format
  deviceId: z
    .string()
    .min(1)
    .max(256)
    .regex(/^[a-zA-Z0-9\-_:.]+$/, "Device ID contains invalid characters"),
  phoneNumber: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, "Phone number must be in E.164 format (e.g. +33612345678)"),
});

export default async function (fastify: FastifyInstance) {
  // [CVE-3 FIX] All auth routes now require a valid Sentra API key
  // Without this hook, ANY anonymous request could trigger device binding
  fastify.addHook("preHandler", verifySentraApiKey);

  fastify.post(
    "/auth/silent-verify/init",
    {
      schema: {
        description: "Initialize Silent Authentication (Number Verification) and get authorization URL",
        tags: ["Auth"],
        security: [{ apiKey: [] }],
        body: {
          type: "object",
          properties: {
            phoneNumber: { type: "string" },
            redirectUri: { type: "string", format: "uri" },
          },
          required: ["phoneNumber", "redirectUri"],
        },
        response: {
          200: {
            description: "Initialization successful",
            type: "object",
            properties: {
              authorizationUrl: { type: "string" },
              state: { type: "string" }
            }
          },
          400: { $ref: "ErrorResponse#" },
          401: { $ref: "ErrorResponse#" },
          403: { $ref: "ErrorResponse#" },
          500: { $ref: "ErrorResponse#" }
        }
      },
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      const body = initSilentVerifySchema.parse(request.body);
      const result = await initSilentVerify(body);
      return result;
    },
  );

  fastify.post(
    "/auth/silent-verify/verify",
    {
      schema: {
        description: "Complete Silent Authentication using access code from the operator callback",
        tags: ["Auth"],
        security: [{ apiKey: [] }],
        body: {
          type: "object",
          properties: {
            phoneNumber: { type: "string" },
            code: { type: "string" },
            state: { type: "string" }
          },
          required: ["phoneNumber", "code", "state"],
        },
        response: {
          200: {
            description: "Verification result",
            type: "object",
            properties: {
              success: { type: "boolean" },
              verified: { type: "boolean" },
              error: { type: "string" }
            }
          },
          400: { $ref: "ErrorResponse#" },
          401: { $ref: "ErrorResponse#" },
          403: { $ref: "ErrorResponse#" },
          500: { $ref: "ErrorResponse#" }
        }
      },
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      const body = verifySilentVerifySchema.parse(request.body);
      const result = await silentVerify(body);
      return result;
    },
  );

  fastify.post(
    "/auth/device-bind",
    {
      schema: {
        description: "Bind a device ID to a phone number (requires API key)",
        tags: ["Auth"],
        security: [{ apiKey: [] }],
        body: {
          type: "object",
          properties: {
            deviceId: { type: "string", maxLength: 256 },
            phoneNumber: { type: "string" },
          },
          required: ["deviceId", "phoneNumber"],
        },
        response: {
          200: {
            description: "Device bound successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              deviceId: { type: "string" },
              status: { type: "string", enum: ["ACTIVE", "PENDING"] }
            }
          },
          400: { $ref: "ErrorResponse#" },
          401: { $ref: "ErrorResponse#" },
          403: { $ref: "ErrorResponse#" },
          500: { $ref: "ErrorResponse#" }
        }
      },
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      const body = deviceBindSchema.parse(request.body);
      // [SECURITY] The binding is scoped to the authenticated API key user
      const result = await bindDevice({
        ...body,
        // Pass the authenticated userId so bindings are tenant-scoped
        ownerId: request.sentraUser.uid,
      });
      return result;
    },
  );
}
