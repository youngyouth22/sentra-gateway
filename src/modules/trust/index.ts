
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
 * Hash phone number for the Collective Intelligence Nexus
 */
function hashPhone(phoneNumber: string): string {
  return crypto.createHash("sha256").update(phoneNumber).digest("hex");
}

export async function evaluateTrust(phoneNumber: string): Promise<TrustResult> {
  const phoneHash = hashPhone(phoneNumber);

  // 1. Fetch Collective Intelligence from Sentra Nexus
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

  // 2. Call Nokia as Code APIs for real-time network signals
  const [simSwapResult, deviceStatusResult, locationResult] = await Promise.all([
    getSimSwapStatus(phoneNumber),
    getDeviceStatus(phoneNumber),
    getLocationStatus(phoneNumber),
  ]);

  const signals: TrustSignals = {
    simSwap: simSwapResult.swapped || false,
    deviceChanged: deviceStatusResult.changed || false,
    roaming: locationResult.roaming || false,
  };

  // 3. Persist new signals to the Nexus for global learning
  if (signals.simSwap || signals.deviceChanged || signals.roaming) {
    const signalsToInsert = [];
    if (signals.simSwap) signalsToInsert.push({ identity_id: identity.id, signal_type: 'sim_swap', severity_level: 5 });
    if (signals.deviceChanged) signalsToInsert.push({ identity_id: identity.id, signal_type: 'device_change', severity_level: 3 });
    if (signals.roaming) signalsToInsert.push({ identity_id: identity.id, signal_type: 'roaming', severity_level: 2 });
    
    await supabase.from("identity_signals").insert(signalsToInsert);
    
    // Refresh identity to get updated global score after triggers
    const { data: updatedIdentity } = await supabase
      .from("identities")
      .select("*")
      .eq("id", identity.id)
      .single();
    identity = updatedIdentity;
  }

  // 4. Combine Network Score with Nexus Collective Score
  // The local score is the identity's global score
  const finalScore = identity.global_trust_score;

  const reasons: string[] = [];
  if (signals.simSwap) reasons.push("SIM card was recently swapped");
  if (signals.deviceChanged) reasons.push("Device has changed");
  if (signals.roaming) reasons.push("Device is roaming");
  if (finalScore < 50 && reasons.length === 0) reasons.push("Negative reputation in the Sentra Nexus network");

  // Determine risk level and decision
  let riskLevel: "low" | "medium" | "high";
  let decision: "ALLOW" | "STEP_UP_AUTH" | "BLOCK";

  if (finalScore > 85) {
    riskLevel = "low";
    decision = "ALLOW";
  } else if (finalScore >= 40) {
    riskLevel = "medium";
    decision = "STEP_UP_AUTH";
  } else {
    riskLevel = "high";
    decision = "BLOCK";
  }

  // Trigger webhook if high risk
  if (finalScore < 40) {
    triggerTrustAlert({ phoneNumber, trustScore: finalScore, signals, reasons });
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

async function getSimSwapStatus(phoneNumber: string): Promise<{ swapped: boolean }> {
  try {
    const device = nacClient.devices.get({ phoneNumber });
    const swapped = await device.verifySimSwap(24);
    return { swapped: Boolean(swapped) };
  } catch (error) {
    return { swapped: false };
  }
}

async function getDeviceStatus(phoneNumber: string): Promise<{ changed: boolean }> {
  try {
    const device = nacClient.devices.get({ phoneNumber });
    const changed = await device.verifyDeviceSwap(24);
    return { changed: Boolean(changed) };
  } catch (error) {
    return { changed: false };
  }
}

async function getLocationStatus(phoneNumber: string): Promise<{ roaming: boolean }> {
  try {
    const device = nacClient.devices.get({ phoneNumber });
    const roamingResult = await device.getRoaming();
    const roaming = typeof roamingResult === "boolean" ? roamingResult : Boolean((roamingResult as any).roaming || false);
    return { roaming };
  } catch (error) {
    return { roaming: false };
  }
}

export async function reportFraud(phoneNumber: string, clientId: string, type: string, severity: number, description: string) {
  const phoneHash = hashPhone(phoneNumber);
  
  // Get identity
  const { data: identity } = await supabase.from("identities").select("id").eq("phone_hash", phoneHash).single();
  
  if (identity) {
    await supabase.from("fraud_reports").insert({
      identity_id: identity.id,
      reporter_client_id: clientId,
      fraud_type: type,
      severity,
      description
    });
    return { success: true };
  }
  return { success: false, error: "Identity not found" };
}
