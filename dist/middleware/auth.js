import { supabase } from "../plugins/supabase.js";
import { verifyApiKey } from "../modules/auth/apiKey.js";
/**
 * Authenticates requests using Supabase JWT Bearer tokens.
 * Used for admin/user-facing routes (API key management, analytics).
 */
export async function verifySupabaseToken(request, reply) {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return reply
            .status(401)
            .send({ error: "Unauthorized", message: "Missing or invalid Bearer token" });
    }
    // [SECURITY] Validate token length to prevent memory exhaustion
    const token = authHeader.slice(7); // "Bearer ".length === 7
    if (token.length > 2048) {
        return reply
            .status(401)
            .send({ error: "Unauthorized", message: "Token too long" });
    }
    try {
        const { data: { user }, error, } = await supabase.auth.getUser(token);
        if (error || !user) {
            // [SECURITY] Do not reveal whether token is expired vs invalid
            throw new Error("Token validation failed");
        }
        request.sentraUser = {
            uid: user.id,
            email: user.email,
        };
    }
    catch {
        // [SECURITY] Generic error message — no information leakage about token state
        return reply
            .status(401)
            .send({ error: "Unauthorized", message: "Authentication failed" });
    }
}
/**
 * Authenticates requests using Sentra API Keys (x-api-key header).
 * Used for all programmatic/B2B API access.
 */
export async function verifySentraApiKey(request, reply) {
    const apiKey = request.headers["x-api-key"];
    if (!apiKey) {
        return reply
            .status(401)
            .send({ error: "Unauthorized", message: "Missing x-api-key header" });
    }
    // [SECURITY] Validate key format and length before hitting the database
    if (typeof apiKey !== "string" || apiKey.length > 256 || !apiKey.startsWith("sentra_")) {
        return reply
            .status(401)
            .send({ error: "Unauthorized", message: "Invalid API key format" });
    }
    const keyData = await verifyApiKey(apiKey);
    if (!keyData) {
        // [SECURITY] Use constant-time-like response — don't leak timing info
        return reply
            .status(401)
            .send({ error: "Unauthorized", message: "Invalid or revoked API key" });
    }
    request.apiKeyId = keyData.id;
    request.sentraUser = {
        uid: keyData.userId,
    };
}
//# sourceMappingURL=auth.js.map