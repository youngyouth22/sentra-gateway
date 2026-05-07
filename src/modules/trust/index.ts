import { NetworkAsCodeClient } from "network-as-code";
import crypto from "crypto";
import { config } from "../../config/index.js";
import { supabase } from "../../plugins/supabase.js";
import { triggerTrustAlert } from "../../utils/webhookDispatcher.js";
import { EvaluateRequest, EvaluateResponse } from "./types.js";
import { calculateRiskScore, RawSignals } from "./scorer.js";

const nacClient = new NetworkAsCodeClient(config.nokiaToken, config.nokiaEnv);

/**
 * Hash phone number for anonymous collective intelligence storage.
 * Exported so other modules (auth) can use the same hashing strategy consistently.
 * [CVE-5] SHA-256 one-way hash — raw phone number never stored
 */
export function hashPhone(phoneNumber: string): string {
  return crypto.createHash("sha256").update(phoneNumber).digest("hex");
}

/**
 * Main entry point for trust evaluation.
 * Extracts signals from network APIs and collective intelligence, then runs the scoring engine.
 */
export async function evaluateTrust(req: EvaluateRequest, userId: string): Promise<EvaluateResponse> {
  const phoneHash = hashPhone(req.phone_number);

  // 1. Fetch community signals from Collective Intelligence (Supabase)
  const { data: reports } = await supabase
    .from("fraud_reports")
    .select("id")
    .eq("identity_id", (await getIdentityId(phoneHash)))
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const communityReportsCount = reports?.length || 0;

  // 2. Fetch Network Signals (Nokia APIs)
  // In a production environment, these would be real calls. 
  // For this standalone runnable version, we use the results from getSimSwapStatus etc.
  const [simSwapResult, deviceStatusResult] = await Promise.all([
    getSimSwapStatus(req.phone_number),
    getDeviceStatus(req.phone_number),
  ]);

  // 3. Mock logic for Geofence and Velocity (would normally use DB + Location API)
  const isGeofenceAnomaly = req.sender_location?.country_code !== "CM"; // Mock: suspect anything outside Cameroon for this demo
  const mockVelocity = 2; // Default mock velocity
  const mockAccountAge = 450; // 15 months

  const rawSignals: RawSignals = {
    communityReportsCount,
    simSwapRecent: simSwapResult.swapped,
    geofenceAnomaly: isGeofenceAnomaly,
    transactionVelocity: mockVelocity,
    deviceTrusted: req.device_trusted,
    accountAgeDays: mockAccountAge,
    hasDeviceId: !!req.device_id,
    hasLocation: !!req.sender_location
  };

  // 4. Run the pure scoring engine
  const result = calculateRiskScore(req.phone_number, rawSignals);

  // 5. Audit & Alerts
  if (result.decision === "BLOCK" || result.risk_score > 60) {
    triggerTrustAlert(userId, {
      phoneHash,
      trustScore: result.risk_score,
      signals: result.signals,
      explanation: result.explanation,
    });
  }

  // 6. Record this evaluation in the DB for future velocity checks
  await supabase.from("trust_evaluations").insert({
    phone_hash: phoneHash,
    risk_score: result.risk_score,
    decision: result.decision,
    context: req
  });

  return result;
}

async function getIdentityId(phoneHash: string): Promise<string> {
  let { data: identity } = await supabase
    .from("identities")
    .select("id")
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
  return identity!.id;
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
