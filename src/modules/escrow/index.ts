import { randomUUID } from "node:crypto";
import { triggerEscrowCreated, triggerEscrowReleased } from "../../utils/webhookDispatcher.js";
import { supabase } from "../../plugins/supabase.js";

export interface EscrowCreateRequest {
  senderPhone: string;
  receiverPhone: string;
  amount: number;
  ownerId: string; // [CVE-7 FIX] Escrow must be tied to an owner
}

export interface EscrowResult {
  escrowId: string;
  status: "PENDING" | "RELEASED" | "REFUNDED";
  amount: number;
  ownerId: string;
}

export async function createEscrow(request: EscrowCreateRequest): Promise<EscrowResult> {
  // [VH-4 FIX] Use cryptographically secure UUID — Date.now() was predictable
  const escrowId = randomUUID();

  // Persist to database (instead of in-memory)
  const { error } = await supabase.from("escrows").insert({
    id: escrowId,
    sender_phone: request.senderPhone,
    receiver_phone: request.receiverPhone,
    amount: request.amount,
    owner_id: request.ownerId,
    status: "PENDING",
  });

  if (error) {
    throw new Error("Failed to create escrow");
  }

  const result: EscrowResult = {
    escrowId,
    status: "PENDING",
    amount: request.amount,
    ownerId: request.ownerId,
  };

  // Non-blocking webhook
  triggerEscrowCreated({ escrowId, amount: request.amount, status: "PENDING" });

  return result;
}

export async function releaseEscrow(
  escrowId: string,
  requesterId: string, // [CVE-7 FIX] Caller identity required
): Promise<EscrowResult | null> {
  // [CVE-7 FIX] Verify ownership before releasing — prevents unauthorized fund release
  const { data: escrow, error: fetchError } = await supabase
    .from("escrows")
    .select("*")
    .eq("id", escrowId)
    .eq("owner_id", requesterId) // Ownership check at DB level
    .eq("status", "PENDING")    // Cannot release an already-released escrow
    .single();

  if (fetchError || !escrow) {
    return null; // Caller gets 404 — no information leakage
  }

  const { error: updateError } = await supabase
    .from("escrows")
    .update({ status: "RELEASED" })
    .eq("id", escrowId);

  if (updateError) {
    throw new Error("Failed to release escrow");
  }

  const result: EscrowResult = {
    escrowId,
    status: "RELEASED",
    amount: escrow.amount,
    ownerId: escrow.owner_id,
  };

  triggerEscrowReleased({ escrowId, amount: escrow.amount, status: "RELEASED" });

  return result;
}
