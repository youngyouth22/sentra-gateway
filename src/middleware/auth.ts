import { FastifyReply, FastifyRequest } from "fastify";
import { supabase } from "../plugins/supabase.js";
import { verifyApiKey } from "../modules/auth/apiKey.js";
import { AppError, ErrorCodes } from "../utils/errors.js";

declare module "fastify" {
  interface FastifyRequest {
    sentraUser: {
      uid: string;
      email?: string;
    };
    apiKeyId?: string;
  }
}

/**
 * Authenticates requests using Supabase JWT Bearer tokens.
 * Used for admin/user-facing routes (API key management, analytics).
 */
export async function verifySupabaseToken(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Missing or invalid Bearer token", 401, ErrorCodes.UNAUTHORIZED);
  }

  // [SECURITY] Validate token length to prevent memory exhaustion
  const token = authHeader.slice(7); // "Bearer ".length === 7
  if (token.length > 2048) {
    throw new AppError("Token too long", 401, ErrorCodes.UNAUTHORIZED);
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      // [SECURITY] Do not reveal whether token is expired vs invalid
      throw new Error("Token validation failed");
    }

    request.sentraUser = {
      uid: user.id,
      email: user.email,
    };
  } catch {
    // [SECURITY] Generic error message — no information leakage about token state
    throw new AppError("Authentication failed", 401, ErrorCodes.UNAUTHORIZED);
  }
}

/**
 * Authenticates requests using Sentra API Keys (x-api-key header).
 * Used for all programmatic/B2B API access.
 */
export async function verifySentraApiKey(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const apiKey = request.headers["x-api-key"] as string | undefined;

  if (!apiKey) {
    throw new AppError("Missing x-api-key header", 401, ErrorCodes.UNAUTHORIZED);
  }

  // [SECURITY] Validate key format and length before hitting the database
  if (typeof apiKey !== "string" || apiKey.length > 256 || !apiKey.startsWith("sentra_")) {
    throw new AppError("Invalid API key format", 401, ErrorCodes.UNAUTHORIZED);
  }

  const keyData = await verifyApiKey(apiKey);

  if (!keyData) {
    // [SECURITY] Use constant-time-like response — don't leak timing info
    throw new AppError("Invalid or revoked API key", 401, ErrorCodes.UNAUTHORIZED);
  }

  request.apiKeyId = keyData.id;
  request.sentraUser = {
    uid: keyData.userId,
  };
}
