import { FastifyReply, FastifyRequest } from "fastify";
/**
 * [B2B IDEMPOTENCY]
 * Middleware to handle idempotency keys (X-Idempotency-Key).
 * Ensures that sensitive operations (like Escrow creation) are not executed multiple times
 * if a client retries due to network issues.
 */
export declare function handleIdempotency(request: FastifyRequest, reply: FastifyReply): Promise<undefined>;
/**
 * Saves the response for a given idempotency key.
 */
export declare function saveIdempotency(request: FastifyRequest, statusCode: number, body: any): Promise<void>;
//# sourceMappingURL=idempotency.d.ts.map