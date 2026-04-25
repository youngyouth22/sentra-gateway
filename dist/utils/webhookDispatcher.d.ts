export interface WebhookPayload {
    event: string;
    data: any;
    timestamp: string;
}
export declare function dispatchWebhook(url: string, payload: WebhookPayload): Promise<void>;
export declare function triggerTrustAlert(data: any): Promise<void>;
export declare function triggerTransactionBlocked(data: any): Promise<void>;
export declare function triggerTransactionStepUp(data: any): Promise<void>;
export declare function triggerEscrowCreated(data: any): Promise<void>;
export declare function triggerEscrowReleased(data: any): Promise<void>;
//# sourceMappingURL=webhookDispatcher.d.ts.map