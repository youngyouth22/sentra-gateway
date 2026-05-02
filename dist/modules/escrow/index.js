import { randomUUID } from "node:crypto";
import { triggerEscrowCreated, triggerEscrowReleased } from "../../utils/webhookDispatcher.js";
import { supabase } from "../../plugins/supabase.js";
export async function createEscrow(request) {
    // [VH-4 FIX] Use cryptographically secure UUID
    const escrowId = randomUUID();
    // Persist to database
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
    const result = {
        escrowId,
        status: "PENDING",
        amount: request.amount,
        ownerId: request.ownerId,
    };
    // Non-blocking webhook — passed to specific tenant's endpoints
    triggerEscrowCreated(request.ownerId, { escrowId, amount: request.amount, status: "PENDING" });
    return result;
}
export async function releaseEscrow(escrowId, requesterId) {
    // Verify ownership before releasing
    const { data: escrow, error: fetchError } = await supabase
        .from("escrows")
        .select("*")
        .eq("id", escrowId)
        .eq("owner_id", requesterId)
        .eq("status", "PENDING")
        .single();
    if (fetchError || !escrow) {
        return null;
    }
    const { error: updateError } = await supabase
        .from("escrows")
        .update({ status: "RELEASED" })
        .eq("id", escrowId);
    if (updateError) {
        throw new Error("Failed to release escrow");
    }
    const result = {
        escrowId,
        status: "RELEASED",
        amount: escrow.amount,
        ownerId: escrow.owner_id,
    };
    // Trigger webhook for specific tenant
    triggerEscrowReleased(requesterId, { escrowId, amount: escrow.amount, status: "RELEASED" });
    return result;
}
//# sourceMappingURL=index.js.map