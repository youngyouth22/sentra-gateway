export interface WebhookPayload {
    event: string;
    data: Record<string, unknown>;
    timestamp: string;
}
/**
 * [CVE-4 FIX] Dispatch a webhook to a pre-validated HTTPS URL.
 * URL validation happens at startup via config schema (isValidWebhookUrl).
 * This function performs a secondary runtime check as defense-in-depth.
 */
export declare function dispatchWebhook(url: string, payload: WebhookPayload, signingSecret?: string): Promise<void>;
export declare function triggerTrustAlert(userId: string, data: Record<string, unknown>): Promise<void>;
export declare function triggerTransactionBlocked(userId: string, data: Record<string, unknown>): Promise<void>;
export declare function triggerTransactionStepUp(userId: string, data: Record<string, unknown>): Promise<void>;
export declare function triggerEscrowCreated(userId: string, data: Record<string, unknown>): Promise<void>;
export declare function triggerEscrowReleased(userId: string, data: Record<string, unknown>): Promise<void>;
//# sourceMappingURL=webhookDispatcher.d.ts.map