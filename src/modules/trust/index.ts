import { NetworkAsCodeClient } from "network-as-code";
import crypto from "crypto";
import { config } from "../../config/index.js";
import { supabase } from "../../plugins/supabase.js";
import { triggerTrustAlert } from "../../utils/webhookDispatcher.js";

const nacClient = new NetworkAsCodeClient(config.nokiaToken, config.nokiaEnv);

export interface TrustSignals {
  simSwap: boolean;
  deviceChanged: boolean;
  roaming: boolean;
  callForwarding: boolean;
  unreachable: boolean;
}

export interface TrustResult {
  trustScore: number;
  globalNexusScore: number;
  riskLevel: "low" | "medium" | "high";
  decision: "ALLOW" | "STEP_UP_AUTH" | "BLOCK";
  signals: TrustSignals;
  reasons: string[];
}

/**
 * Hash phone number for anonymous collective intelligence storage.
 * Exported so other modules (auth) can use the same hashing strategy consistently.
 * [CVE-5] SHA-256 one-way hash — raw phone number never stored
 */
export function hashPhone(phoneNumber: string): string {
  return crypto.createHash("sha256").update(phoneNumber).digest("hex");
}

export async function evaluateTrust(phoneNumber: string, userId: string): Promise<TrustResult> {
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
  const [simSwapResult, deviceStatusResult, locationResult, forwardingResult, reachabilityResult] = await Promise.all([
    getSimSwapStatus(phoneNumber),
    getDeviceStatus(phoneNumber),
    getLocationStatus(phoneNumber),
    getCallForwardingStatus(phoneNumber),
    getReachabilityStatus(phoneNumber),
  ]);

  const signals: TrustSignals = {
    simSwap: simSwapResult.swapped || false,
    deviceChanged: deviceStatusResult.changed || false,
    roaming: locationResult.roaming || false,
    callForwarding: forwardingResult.forwarding || false,
    unreachable: reachabilityResult.unreachable || false,
  };

  // 3. Persist new signals to the Nexus for global learning
  if (signals.simSwap || signals.deviceChanged || signals.roaming || signals.callForwarding || signals.unreachable) {
    const signalsToInsert = [];
    if (signals.simSwap)
      signalsToInsert.push({
        identity_id: identity.id,
        signal_type: "sim_swap" as const,
        severity_level: 5,
      });
    if (signals.deviceChanged)
      signalsToInsert.push({
        identity_id: identity.id,
        signal_type: "device_change" as const,
        severity_level: 3,
      });
    if (signals.roaming)
      signalsToInsert.push({
        identity_id: identity.id,
        signal_type: "roaming" as const,
        severity_level: 2,
      });
    if (signals.callForwarding)
      signalsToInsert.push({
        identity_id: identity.id,
        signal_type: "call_forwarding" as const,
        severity_level: 5,
      });
    if (signals.unreachable)
      signalsToInsert.push({
        identity_id: identity.id,
        signal_type: "unreachable_device" as const,
        severity_level: 4,
      });

    await supabase.from("identity_signals").insert(signalsToInsert);
    
    // Refresh identity to get the latest global score if updated by triggers
    const { data: updatedIdentity } = await supabase
      .from("identities")
      .select("*")
      .eq("id", identity.id)
      .single();
    if (updatedIdentity) identity = updatedIdentity;
  }

  // 4. [SOTA SCORING ENGINE] Real-time Weighted Risk Calculation
  // We don't just trust the DB score (which might be stale/async), we calculate real-time impact
  let baseScore = identity.global_trust_score ?? 100;
  let realTimeDeduction = 0;
  const reasons: string[] = [];

  if (signals.simSwap) {
    realTimeDeduction += 65;
    reasons.push("SIM card was recently swapped (High Risk)");
  }
  if (signals.callForwarding) {
    realTimeDeduction += 55;
    reasons.push("Unconditional call forwarding active (OTP Interception Risk)");
  }
  if (signals.unreachable) {
    realTimeDeduction += 30;
    reasons.push("Device is unreachable (Potential bot or virtual number)");
  }
  if (signals.deviceChanged) {
    realTimeDeduction += 20;
    reasons.push("Device hardware change detected");
  }
  if (signals.roaming) {
    realTimeDeduction += 15;
    reasons.push("International roaming active");
  }

  // Synergistic Penalty: If multiple critical signals are present, increase deduction
  if (signals.simSwap && (signals.callForwarding || signals.deviceChanged)) {
    realTimeDeduction += 20; // Critical synergy
    reasons.push("Synergistic fraud patterns detected");
  }

  // Calculate final score (clamped between 0 and 100)
  // We take the minimum of the reputation score and the real-time signal score
  const signalScore = Math.max(0, 100 - realTimeDeduction);
  const finalScore = Math.min(baseScore, signalScore);

  let riskLevel: "low" | "medium" | "high";
  let decision: "ALLOW" | "STEP_UP_AUTH" | "BLOCK";

  // Decision Logic based on SOTA FinTech thresholds
  if (finalScore >= 80) {
    riskLevel = "low";
    decision = "ALLOW";
  } else if (finalScore >= 45) {
    riskLevel = "medium";
    decision = "STEP_UP_AUTH";
  } else {
    riskLevel = "high";
    decision = "BLOCK";
  }

  // [VH-7 FIX] Webhook alert for high-risk transactions
  if (decision === "BLOCK" || finalScore < 40) {
    triggerTrustAlert(userId, {
      phoneHash,
      trustScore: finalScore,
      signals,
      reasons,
    });
  }

  return {
    trustScore: Math.round(finalScore),
    globalNexusScore: identity.global_trust_score,
    riskLevel,
    decision,
    signals,
    reasons,
  };
}

async function getSimSwapStatus(phoneNumber: string): Promise<{ swapped: boolean }> {
  try {
    const device = nacClient.devices.get({ phoneNumber });
    const swapped = await device.verifySimSwap(24);
    return { swapped: Boolean(swapped) };
  } catch {
    return { swapped: false };
  }
}

async function getDeviceStatus(phoneNumber: string): Promise<{ changed: boolean }> {
  try {
    const device = nacClient.devices.get({ phoneNumber });
    const changed = await device.verifyDeviceSwap(24);
    return { changed: Boolean(changed) };
  } catch {
    return { changed: false };
  }
}

async function getLocationStatus(phoneNumber: string): Promise<{ roaming: boolean }> {
  try {
    const device = nacClient.devices.get({ phoneNumber });
    const roamingResult = await device.getRoaming();
    const roaming =
      typeof roamingResult === "boolean"
        ? roamingResult
        : Boolean((roamingResult as any).roaming || false);
    return { roaming };
  } catch {
    return { roaming: false };
  }
}

async function getCallForwardingStatus(phoneNumber: string): Promise<{ forwarding: boolean }> {
  try {
    const device = nacClient.devices.get({ phoneNumber });
    // Verifies if unconditional call forwarding is active (a massive fraud indicator)
    const forwarding = await device.verifyUnconditionalForwarding();
    return { forwarding: Boolean(forwarding) };
  } catch {
    // Fail safe to false if API is unavailable or user hasn't consented
    return { forwarding: false };
  }
}

async function getReachabilityStatus(phoneNumber: string): Promise<{ unreachable: boolean }> {
  try {
    const device = nacClient.devices.get({ phoneNumber });
    // Connectivity status returns the attachment state of the device to the network
    const connectivity = await device.getConnectivity();
    
    // An unreachable device during a transaction is highly suspicious (often indicating a bot or disconnected VoIP number)
    const isReachable = typeof connectivity === "string" && connectivity.toUpperCase().includes("CONNECTED");
    return { unreachable: !isReachable };
  } catch {
    return { unreachable: false }; // Fail open
  }
}

export async function reportFraud(
  phoneNumber: string,
  clientId: string,
  type: string,
  severity: number,
  description: string,
) {
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
