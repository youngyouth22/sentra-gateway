import axios from "axios";
import crypto from "node:crypto";
import { config } from "../config/index.js";
import { supabase } from "../plugins/supabase.js";
/**
 * [CVE-4 FIX] Dispatch a webhook to a pre-validated HTTPS URL.
 * URL validation happens at startup via config schema (isValidWebhookUrl).
 * This function performs a secondary runtime check as defense-in-depth.
 */
export async function dispatchWebhook(url, payload, signingSecret) {
    // [CVE-4 FIX] Runtime SSRF guard
    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    }
    catch {
        console.error(`[webhook] Invalid URL format: ${url}`);
        return;
    }
    if (!config.isProduction && parsedUrl.protocol === "http:") {
        // Allow HTTP only in development for local testing
    }
    else if (parsedUrl.protocol !== "https:") {
        console.error(`[webhook] Blocked non-HTTPS webhook URL: ${parsedUrl.hostname}`);
        return;
    }
    // [CVE-4 FIX] Block known private/internal IP ranges
    const blockedPatterns = [
        /^localhost$/i,
        /^127\./,
        /^0\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[01])\./,
        /^192\.168\./,
        /^169\.254\./, // AWS metadata
        /^::1$/,
    ];
    if (blockedPatterns.some((p) => p.test(parsedUrl.hostname))) {
        console.error(`[webhook] Blocked SSRF attempt to internal address: ${parsedUrl.hostname}`);
        return;
    }
    const payloadString = JSON.stringify(payload);
    const headers = {
        "Content-Type": "application/json",
        "User-Agent": "SENTRA-Gateway/1.0",
    };
    // ── HMAC Signing (B2B Security) ──────────────────────────────────────────
    // We sign the payload with the tenant's secret.
    // The tenant verifies this on their side to ensure the request came from SENTRA.
    if (signingSecret) {
        const signature = crypto
            .createHmac("sha256", signingSecret)
            .update(payloadString)
            .digest("hex");
        headers["X-Sentra-Signature"] = `sha256=${signature}`;
    }
    try {
        await axios.post(url, payloadString, {
            headers,
            timeout: 5000,
            maxRedirects: 0,
        });
        // Log success (non-blocking)
        supabase
            .from("webhook_logs")
            .insert({
            url,
            event: payload.event,
            status: 200,
            payload: payload.data,
        })
            .then(({ error }) => {
            if (error)
                console.error("[webhook-log] Error saving success log:", error.message);
        });
    }
    catch (error) {
        console.error(`[webhook] Failed to dispatch ${payload.event} to ${url}:`, error.message);
        // Log failure (non-blocking)
        supabase
            .from("webhook_logs")
            .insert({
            url,
            event: payload.event,
            status: error.response?.status || 500,
            error: error.message,
            payload: payload.data,
        })
            .then(({ error: logError }) => {
            if (logError)
                console.error("[webhook-log] Error saving failure log:", logError.message);
        });
    }
}
/**
 * Dispatch a webhook to all active endpoints configured for a specific user/tenant.
 */
async function dispatchToUser(userId, event, data) {
    const { data: endpoints, error } = await supabase
        .from("webhook_endpoints")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .contains("events", [event]);
    if (error || !endpoints || endpoints.length === 0) {
        return;
    }
    const payload = {
        event,
        data,
        timestamp: new Date().toISOString(),
    };
    // Parallel dispatch to all endpoints
    await Promise.all(endpoints.map((ep) => dispatchWebhook(ep.url, payload, ep.signing_secret)));
}
// ── Per-Tenant Webhook Triggers ─────────────────────────────────────────────
export async function triggerTrustAlert(userId, data) {
    await dispatchToUser(userId, "trust.alert", data);
}
export async function triggerTransactionBlocked(userId, data) {
    await dispatchToUser(userId, "transaction.blocked", data);
}
export async function triggerTransactionStepUp(userId, data) {
    await dispatchToUser(userId, "transaction.step_up", data);
}
export async function triggerEscrowCreated(userId, data) {
    await dispatchToUser(userId, "escrow.created", data);
}
export async function triggerEscrowReleased(userId, data) {
    await dispatchToUser(userId, "escrow.released", data);
}
//# sourceMappingURL=webhookDispatcher.js.map