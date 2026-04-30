import { FastifyReply, FastifyRequest } from "fastify";
import { supabase } from "../plugins/supabase.js";

/**
 * [B2B IDEMPOTENCY]
 * Middleware to handle idempotency keys (X-Idempotency-Key).
 * Ensures that sensitive operations (like Escrow creation) are not executed multiple times
 * if a client retries due to network issues.
 */
export async function handleIdempotency(request: FastifyRequest, reply: FastifyReply) {
  const idempotencyKey = request.headers["x-idempotency-key"] as string | undefined;

  // Only apply to POST/PATCH/PUT requests with an idempotency key
  if (!idempotencyKey || (request.method !== "POST" && request.method !== "PATCH" && request.method !== "PUT")) {
    return;
  }

  const userId = request.sentraUser?.uid;
  if (!userId) return;

  // 1. Check if we already processed this key for this user
  const { data, error } = await supabase
    .from("idempotency_keys")
    .select("response_code, response_body")
    .eq("user_id", userId)
    .eq("idempotency_key", idempotencyKey)
    .single();

  if (data) {
    request.log.info({ idempotencyKey }, "Idempotency hit: returning cached response");
    return reply
      .status(data.response_code)
      .header("X-Idempotency-Hit", "true")
      .send(data.response_body);
  }

  // 2. Wrap the response to save it once completed
  // We use the 'onSend' hook logic or manually save it in the route
  // For simplicity here, we add it to the request so the route can call saveIdempotency
  (request as any).idempotencyKey = idempotencyKey;
}

/**
 * Saves the response for a given idempotency key.
 */
export async function saveIdempotency(request: FastifyRequest, statusCode: number, body: any) {
  const idempotencyKey = (request as any).idempotencyKey;
  const userId = request.sentraUser?.uid;

  if (!idempotencyKey || !userId) return;

  await supabase.from("idempotency_keys").insert({
    user_id: userId,
    idempotency_key: idempotencyKey,
    request_path: request.url,
    response_code: statusCode,
    response_body: body,
  });
}
