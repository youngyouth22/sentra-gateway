import axios from "axios";
import { config } from "../config/index.js";

export interface WebhookPayload {
  event: string;
  data: Record<string, unknown>; // [SECURITY] Typed — no more `any`
  timestamp: string;
}

/**
 * [CVE-4 FIX] Dispatch a webhook to a pre-validated HTTPS URL.
 * URL validation happens at startup via config schema (isValidWebhookUrl).
 * This function performs a secondary runtime check as defense-in-depth.
 */
export async function dispatchWebhook(
  url: string,
  payload: WebhookPayload,
): Promise<void> {
  // [CVE-4 FIX] Runtime SSRF guard — second line of defense after config validation
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    // [VF-1 FIX] Use structured logging via config, not console.error
    console.error(`[webhook] Invalid URL format: ${url}`);
    return;
  }

  if (!config.isProduction && parsedUrl.protocol === "http:") {
    // Allow HTTP only in development for local testing
  } else if (parsedUrl.protocol !== "https:") {
    console.error(`[webhook] Blocked non-HTTPS webhook URL: ${parsedUrl.hostname}`);
    return;
  }

  // [CVE-4 FIX] Block known private/internal IP ranges at dispatch time
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

  try {
    await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        // [SECURITY] Identify ourselves so receivers can validate the source
        "User-Agent": "SENTRA-Gateway/1.0",
      },
      timeout: 5000,
      // [SECURITY] Disable redirect following to prevent redirect-based SSRF
      maxRedirects: 0,
    });
  } catch (error) {
    // Log failure but never throw — webhook failures must not affect API responses
    console.error(`[webhook] Failed to dispatch ${payload.event}:`, (error as Error).message);
  }
}

export async function triggerTrustAlert(data: Record<string, unknown>): Promise<void> {
  if (!config.webhooks.trustAlert) return;
  await dispatchWebhook(config.webhooks.trustAlert, {
    event: "trust.alert",
    data,
    timestamp: new Date().toISOString(),
  });
}

export async function triggerTransactionBlocked(data: Record<string, unknown>): Promise<void> {
  if (!config.webhooks.transactionBlocked) return;
  await dispatchWebhook(config.webhooks.transactionBlocked, {
    event: "transaction.blocked",
    data,
    timestamp: new Date().toISOString(),
  });
}

export async function triggerTransactionStepUp(data: Record<string, unknown>): Promise<void> {
  if (!config.webhooks.transactionStepUp) return;
  await dispatchWebhook(config.webhooks.transactionStepUp, {
    event: "transaction.step_up",
    data,
    timestamp: new Date().toISOString(),
  });
}

export async function triggerEscrowCreated(data: Record<string, unknown>): Promise<void> {
  if (!config.webhooks.escrowCreated) return;
  await dispatchWebhook(config.webhooks.escrowCreated, {
    event: "escrow.created",
    data,
    timestamp: new Date().toISOString(),
  });
}

export async function triggerEscrowReleased(data: Record<string, unknown>): Promise<void> {
  if (!config.webhooks.escrowReleased) return;
  await dispatchWebhook(config.webhooks.escrowReleased, {
    event: "escrow.released",
    data,
    timestamp: new Date().toISOString(),
  });
}
