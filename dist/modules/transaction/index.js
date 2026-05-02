import { randomUUID } from "node:crypto";
import { evaluateTrust } from "../trust/index.js";
import { triggerTransactionBlocked, triggerTransactionStepUp, } from "../../utils/webhookDispatcher.js";
export async function initiateTransaction(request, userId) {
    // Pass userId to evaluateTrust so it can trigger the right tenant's webhooks
    const trustResult = await evaluateTrust(request.phoneNumber, userId);
    // [VH-3 FIX] Use cryptographically secure UUID instead of Math.random()
    const transactionId = `txn_${randomUUID()}`;
    const approved = trustResult.decision === "ALLOW";
    // Trigger webhooks based on decision — routed to specific tenant
    if (trustResult.decision === "BLOCK") {
        triggerTransactionBlocked(userId, {
            transactionId,
            riskLevel: trustResult.riskLevel,
            decision: trustResult.decision,
            amount: request.amount,
        });
    }
    else if (trustResult.decision === "STEP_UP_AUTH") {
        triggerTransactionStepUp(userId, {
            transactionId,
            riskLevel: trustResult.riskLevel,
            decision: trustResult.decision,
            amount: request.amount,
        });
    }
    return {
        ...trustResult,
        transactionId,
        approved,
    };
}
//# sourceMappingURL=index.js.map