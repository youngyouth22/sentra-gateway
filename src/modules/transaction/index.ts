import { evaluateTrust, TrustResult } from "../trust/index.js";
import {
  triggerTransactionBlocked,
  triggerTransactionStepUp,
} from "../../utils/webhookDispatcher.js";

export interface TransactionRequest {
  phoneNumber: string;
  amount: number;
  // Add other fields as needed
}

export interface TransactionResponse extends TrustResult {
  transactionId: string;
  approved: boolean;
}

export async function initiateTransaction(
  request: TransactionRequest,
): Promise<TransactionResponse> {
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
  } else if (trustResult.decision === "STEP_UP_AUTH") {
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

function generateTransactionId(): string {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
