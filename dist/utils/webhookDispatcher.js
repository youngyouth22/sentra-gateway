import axios from "axios";
export async function dispatchWebhook(url, payload) {
    try {
        await axios.post(url, payload, {
            headers: {
                "Content-Type": "application/json",
            },
            timeout: 5000, // 5 seconds timeout
        });
        console.log(`Webhook dispatched to ${url}`);
    }
    catch (error) {
        console.error(`Failed to dispatch webhook to ${url}:`, error);
        // In production, might retry or log to monitoring
    }
}
// Specific webhook functions
export async function triggerTrustAlert(data) {
    const payload = {
        event: "trust.alert",
        data,
        timestamp: new Date().toISOString(),
    };
    // Assume webhook URL is configured
    const url = process.env.WEBHOOK_TRUST_ALERT_URL ||
        "http://example.com/webhooks/trust.alert";
    await dispatchWebhook(url, payload);
}
export async function triggerTransactionBlocked(data) {
    const payload = {
        event: "transaction.blocked",
        data,
        timestamp: new Date().toISOString(),
    };
    const url = process.env.WEBHOOK_TRANSACTION_BLOCKED_URL ||
        "http://example.com/webhooks/transaction.blocked";
    await dispatchWebhook(url, payload);
}
export async function triggerTransactionStepUp(data) {
    const payload = {
        event: "transaction.step_up",
        data,
        timestamp: new Date().toISOString(),
    };
    const url = process.env.WEBHOOK_TRANSACTION_STEP_UP_URL ||
        "http://example.com/webhooks/transaction.step_up";
    await dispatchWebhook(url, payload);
}
export async function triggerEscrowCreated(data) {
    const payload = {
        event: "escrow.created",
        data,
        timestamp: new Date().toISOString(),
    };
    const url = process.env.WEBHOOK_ESCROW_CREATED_URL ||
        "http://example.com/webhooks/escrow.created";
    await dispatchWebhook(url, payload);
}
export async function triggerEscrowReleased(data) {
    const payload = {
        event: "escrow.released",
        data,
        timestamp: new Date().toISOString(),
    };
    const url = process.env.WEBHOOK_ESCROW_RELEASED_URL ||
        "http://example.com/webhooks/escrow.released";
    await dispatchWebhook(url, payload);
}
//# sourceMappingURL=webhookDispatcher.js.map