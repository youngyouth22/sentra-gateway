import { FastifyReply, FastifyRequest } from "fastify";
import { supabase } from "../plugins/supabase.js";
import { verifyApiKey } from "../modules/auth/apiKey.js";

declare module "fastify" {
  interface FastifyRequest {
    sentraUser: {
      uid: string;
      email?: string;
    };
    apiKeyId?: string;
  }
}

export async function verifySupabaseToken(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply
      .status(401)
      .send({ error: "Unauthorized: Missing or invalid token" });
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new Error("Invalid token");
    }

    request.sentraUser = {
      uid: user.id,
      email: user.email,
    };
  } catch (error) {
    return reply
      .status(401)
      .send({ error: "Unauthorized: Invalid Supabase token" });
  }
}

export async function verifySentraApiKey(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const apiKey = request.headers["x-api-key"] as string;

  if (!apiKey) {
    return reply.status(401).send({ error: "Unauthorized: Missing API key" });
  }

  const keyData = await verifyApiKey(apiKey);
  if (!keyData) {
    return reply.status(401).send({ error: "Unauthorized: Invalid API key" });
  }

  request.apiKeyId = keyData.id;
  request.sentraUser = {
    uid: keyData.userId,
  };
}
