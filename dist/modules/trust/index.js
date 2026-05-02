import { NetworkAsCodeClient } from "network-as-code";
import crypto from "crypto";
import { config } from "../../config/index.js";
import { supabase } from "../../plugins/supabase.js";
import { triggerTrustAlert } from "../../utils/webhookDispatcher.js";
const nacClient = new NetworkAsCodeClient(config.nokiaToken, config.nokiaEnv);
/**
 * Hash phone number for anonymous collective intelligence storage.
 * Exported so other modules (auth) can use the same hashing strategy consistently.
 * [CVE-5] SHA-256 one-way hash — raw phone number never stored
 */
export function hashPhone(phoneNumber) {
    return crypto.createHash("sha256").update(phoneNumber).digest("hex");
}
export async function evaluateTrust(phoneNumber, userId) {
    const phoneHash = hashPhone(phoneNumber);
    // 1. Fetch or create identity in Collective Intelligence Nexus
    let { data: identity } = await supabase
        .from("identities")
        .select("*")
        .eq("phone_hash", phoneHash)
        .single();
    if (!identity) {
        const { data: newIdentity } = await supabase
            .from("identities")
            .insert({ phone_hash: phoneHash })
            .select()
            .single();
        identity = newIdentity;
    }
    // 2. Call Nokia Network-as-Code APIs for real-time network signals
    const [simSwapResult, deviceStatusResult, locationResult] = await Promise.all([
        getSimSwapStatus(phoneNumber),
        getDeviceStatus(phoneNumber),
        getLocationStatus(phoneNumber),
    ]);
    const signals = {
        simSwap: simSwapResult.swapped || false,
        deviceChanged: deviceStatusResult.changed || false,
        roaming: locationResult.roaming || false,
    };
    // 3. Persist new signals to the Nexus for global learning
    if (signals.simSwap || signals.deviceChanged || signals.roaming) {
        const signalsToInsert = [];
        if (signals.simSwap)
            signalsToInsert.push({
                identity_id: identity.id,
                // [VM-5 FIX] signal_type now uses controlled values, not free-form strings
                signal_type: "sim_swap",
                severity_level: 5,
            });
        if (signals.deviceChanged)
            signalsToInsert.push({
                identity_id: identity.id,
                signal_type: "device_change",
                severity_level: 3,
            });
        if (signals.roaming)
            signalsToInsert.push({
                identity_id: identity.id,
                signal_type: "roaming",
                severity_level: 2,
            });
        await supabase.from("identity_signals").insert(signalsToInsert);
        // Refresh identity after trigger updates global score
        const { data: updatedIdentity } = await supabase
            .from("identities")
            .select("*")
            .eq("id", identity.id)
            .single();
        identity = updatedIdentity;
    }
    // 4. Compute final trust score from collective intelligence
    const finalScore = identity.global_trust_score ?? 100;
    const reasons = [];
    if (signals.simSwap)
        reasons.push("SIM card was recently swapped");
    if (signals.deviceChanged)
        reasons.push("Device has changed");
    if (signals.roaming)
        reasons.push("Device is roaming");
    if (finalScore < 50 && reasons.length === 0)
        reasons.push("Negative reputation in the Sentra Nexus network");
    let riskLevel;
    let decision;
    if (finalScore > 85) {
        riskLevel = "low";
        decision = "ALLOW";
    }
    else if (finalScore >= 40) {
        riskLevel = "medium";
        decision = "STEP_UP_AUTH";
    }
    else {
        riskLevel = "high";
        decision = "BLOCK";
    }
    // [VH-7 FIX] Webhook payload does NOT include raw phone number
    if (finalScore < 40) {
        triggerTrustAlert(userId, {
            phoneHash, // Use hash, not raw phone number
            trustScore: finalScore,
            signals,
            reasons,
        });
    }
    return {
        trustScore: finalScore,
        globalNexusScore: identity.global_trust_score,
        riskLevel,
        decision,
        signals,
        reasons,
    };
}
async function getSimSwapStatus(phoneNumber) {
    try {
        const device = nacClient.devices.get({ phoneNumber });
        const swapped = await device.verifySimSwap(24);
        return { swapped: Boolean(swapped) };
    }
    catch {
        return { swapped: false };
    }
}
async function getDeviceStatus(phoneNumber) {
    try {
        const device = nacClient.devices.get({ phoneNumber });
        const changed = await device.verifyDeviceSwap(24);
        return { changed: Boolean(changed) };
    }
    catch {
        return { changed: false };
    }
}
async function getLocationStatus(phoneNumber) {
    try {
        const device = nacClient.devices.get({ phoneNumber });
        const roamingResult = await device.getRoaming();
        const roaming = typeof roamingResult === "boolean"
            ? roamingResult
            : Boolean(roamingResult.roaming || false);
        return { roaming };
    }
    catch {
        return { roaming: false };
    }
}
export async function reportFraud(phoneNumber, clientId, type, severity, description) {
    const phoneHash = hashPhone(phoneNumber);
    const { data: identity } = await supabase
        .from("identities")
        .select("id")
        .eq("phone_hash", phoneHash)
        .single();
    if (identity) {
        await supabase.from("fraud_reports").insert({
            identity_id: identity.id,
            reporter_client_id: clientId,
            // [VM-5 FIX] type is already validated as enum at the route layer
            fraud_type: type,
            severity,
            // [SECURITY] Sanitize description length
            description: description.slice(0, 1000),
        });
        return { success: true };
    }
    return { success: false, error: "Identity not found" };
}
//# sourceMappingURL=index.js.map