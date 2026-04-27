import { randomUUID } from "node:crypto";
import { evaluateTrust, TrustResult } from "../trust/index.js";
import {
  triggerTransactionBlocked,
  triggerTransactionStepUp,
} from "../../utils/webhookDispatcher.js";

export interface TransactionRequest {
  phoneNumber: string;
  amount: number;
}

export interface TransactionResponse extends TrustResult {
  transactionId: string;
  approved: boolean;
}

export async function initiateTransaction(
  request: TransactionRequest,
): Promise<TransactionResponse> {
  const trustResult = await evaluateTrust(request.phoneNumber);

  // [VH-3 FIX] Use cryptographically secure UUID instead of Math.random()
  // Math.random() is NOT cryptographically secure and produces predictable IDs
  const transactionId = `txn_${randomUUID()}`;
  const approved = trustResult.decision === "ALLOW";

  // Trigger webhooks based on decision — non-blocking (fire & forget)
  if (trustResult.decision === "BLOCK") {
    triggerTransactionBlocked({
      transactionId,
      riskLevel: trustResult.riskLevel,
      decision: trustResult.decision,
      amount: request.amount,
    });
  } else if (trustResult.decision === "STEP_UP_AUTH") {
    triggerTransactionStepUp({
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
