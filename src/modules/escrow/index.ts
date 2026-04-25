import { triggerEscrowCreated, triggerEscrowReleased } from "../../utils/webhookDispatcher.js";

export interface EscrowCreateRequest {
  senderPhone: string;
  receiverPhone: string;
  amount: number;
}

export interface EscrowReleaseRequest {
  escrowId: string;
}

export interface EscrowResult {
  escrowId: string;
  status: "PENDING" | "RELEASED" | "REFUNDED";
  amount: number;
}

export async function createEscrow(request: EscrowCreateRequest): Promise<EscrowResult> {
  const escrowId = `esc_${Date.now()}`;
  
  const result: EscrowResult = {
    escrowId,
    status: "PENDING",
    amount: request.amount,
  };
  
  // Trigger webhook
  triggerEscrowCreated(result);
  
  return result;
}

export async function releaseEscrow(escrowId: string): Promise<EscrowResult> {
  const result: EscrowResult = {
    escrowId,
    status: "RELEASED",
    amount: 0, // In real case, fetch from DB
  };
  
  // Trigger webhook
  triggerEscrowReleased(result);
  
  return result;
}
