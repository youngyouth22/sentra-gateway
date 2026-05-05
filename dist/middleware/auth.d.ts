import { FastifyReply, FastifyRequest } from "fastify";
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
export declare function verifySupabaseToken(request: FastifyRequest, reply: FastifyReply): Promise<void>;
/**
 * Authenticates requests using Sentra API Keys (x-api-key header).
 * Used for all programmatic/B2B API access.
 */
export declare function verifySentraApiKey(request: FastifyRequest, reply: FastifyReply): Promise<void>;
//# sourceMappingURL=auth.d.ts.map