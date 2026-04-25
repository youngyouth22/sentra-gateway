import { evaluateTrust } from "../trust/index.js";
import { triggerTransactionBlocked, triggerTransactionStepUp, } from "../../utils/webhookDispatcher.js";
export async function initiateTransaction(request) {
    const trustResult = await evaluateTrust(request.phoneNumber);
    const transactionId = generateTransactionId();
    const approved = trustResult.decision === "ALLOW";
    // Trigger webhooks based on decision
    if (trustResult.decision === "BLOCK") {
        triggerTransactionBlocked({
            transactionId,
            ...trustResult,
            amount: request.amount,
        });
    }
    else if (trustResult.decision === "STEP_UP_AUTH") {
        triggerTransactionStepUp({
            transactionId,
            ...trustResult,
            amount: request.amount,
        });
    }
    return {
        ...trustResult,
        transactionId,
        approved,
    };
}
function generateTransactionId() {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
//# sourceMappingURL=index.js.map