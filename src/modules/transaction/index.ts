import { randomUUID } from "node:crypto";
import { evaluateTrust } from "../trust/index.js";
import { EvaluateResponse } from "../trust/types.js";
import {
  triggerTransactionBlocked,
  triggerTransactionStepUp,
} from "../../utils/webhookDispatcher.js";

export interface TransactionRequest {
  phoneNumber: string;
  amount: number;
}

export interface TransactionResponse extends EvaluateResponse {
  transactionId: string;
  approved: boolean;
}

export async function initiateTransaction(
  request: TransactionRequest,
  userId: string, // [SECURITY] Added userId to route webhooks to the correct tenant
): Promise<TransactionResponse> {
  // Construct the full transaction context required by the new trust engine
  const trustResult = await evaluateTrust({
    phone_number: request.phoneNumber,
    transaction_amount: request.amount,
    transaction_currency: "XAF", // Default currency
    sender_phone: request.phoneNumber, // Mock sender for this wrapper
    timestamp: new Date().toISOString()
  }, userId);

  const transactionId = `txn_${randomUUID()}`;
  const approved = trustResult.decision === "APPROVE";

  // Trigger webhooks based on decision — routed to specific tenant
  if (trustResult.decision === "BLOCK") {
    triggerTransactionBlocked(userId, {
      transactionId,
      riskLevel: trustResult.risk_level,
      decision: trustResult.decision,
      amount: request.amount,
    });
  } else if (trustResult.decision === "STEP_UP") {
    triggerTransactionStepUp(userId, {
      transactionId,
      riskLevel: trustResult.risk_level,
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
