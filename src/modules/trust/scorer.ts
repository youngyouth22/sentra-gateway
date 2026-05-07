import { EvaluateResponse, SignalDetail, TrustSignals } from "./types.js";

export interface RawSignals {
  communityReportsCount: number;
  simSwapRecent: boolean;
  geofenceAnomaly: boolean;
  transactionVelocity: number; // tx in past 2h
  deviceTrusted: boolean | undefined;
  accountAgeDays: number;
  hasDeviceId: boolean;
  hasLocation: boolean;
}

/**
 * Pure scoring engine: (signals) -> score
 * Implements a weighted multi-signal scoring model with interaction multipliers.
 */
export function calculateRiskScore(phoneNumber: string, signals: RawSignals): EvaluateResponse {
  const startTime = Date.now();

  // 1. Define Baseline Weights
  const weights = {
    communityReports: 35,
    simSwap: 25,
    geofence: 15,
    velocity: 10,
    deviceTrust: 8,
    accountAge: 7,
  };

  // 2. Calculate Individual Signal Contributions
  const contributions = {
    community_reports: {
      score_contribution: signals.communityReportsCount > 0 ? Math.min(weights.communityReports, signals.communityReportsCount * 8) : 0,
      detail: signals.communityReportsCount > 0 
        ? `Reported ${signals.communityReportsCount} times for scam/fraud` 
        : "No community reports found"
    },
    sim_swap_risk: {
      score_contribution: signals.simSwapRecent ? weights.simSwap : 0,
      detail: signals.simSwapRecent ? "SIM changed within the last 72 hours" : "No recent SIM swap detected"
    },
    geofence_anomaly: {
      score_contribution: signals.geofenceAnomaly ? weights.geofence : 0,
      detail: signals.geofenceAnomaly ? "Unusual transaction location pattern" : "Location matches historical profile"
    },
    transaction_velocity: {
      score_contribution: signals.transactionVelocity > 3 ? weights.velocity : (signals.transactionVelocity > 0 ? 5 : 0),
      detail: `${signals.transactionVelocity} transactions in the past 2 hours`
    },
    device_trust: {
      score_contribution: signals.deviceTrusted === false ? weights.deviceTrust : 0,
      detail: signals.deviceTrusted === true ? "Device is registered and trusted" : (signals.deviceTrusted === false ? "Unknown or untrusted device" : "No device information available")
    },
    account_age: {
      score_contribution: signals.accountAgeDays < 30 ? weights.accountAge : 0,
      detail: signals.accountAgeDays < 30 ? `New account (${signals.accountAgeDays} days old)` : "Established account"
    }
  };

  // 3. Base Score = Weighted Sum
  let baseScore = Object.values(contributions).reduce((sum, sig) => sum + sig.score_contribution, 0);

  // 4. Apply Interaction Multipliers
  // - If (community_reports > 0) AND (sim_swap = true): multiply base by 1.35
  if (signals.communityReportsCount > 0 && signals.simSwapRecent) {
    baseScore *= 1.35;
  }
  // - If (geofence_anomaly = true) AND (device_trusted = false): multiply by 1.20
  if (signals.geofenceAnomaly && signals.deviceTrusted === false) {
    baseScore *= 1.20;
  }
  // - If (velocity > 3 tx in 2h) AND (account_age < 30 days): multiply by 1.25
  if (signals.transactionVelocity > 3 && signals.accountAgeDays < 30) {
    baseScore *= 1.25;
  }

  // Cap final score at 100
  const riskScore = Math.min(100, Math.round(baseScore));

  // 5. Determine Risk Level and Decision
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  let decision: "APPROVE" | "STEP_UP" | "BLOCK" = "APPROVE";
  let recommendedAction = "Approve transaction";

  if (riskScore > 65) {
    riskLevel = "HIGH";
    decision = "BLOCK";
    recommendedAction = "Block transaction and notify sender immediately";
  } else if (riskScore > 30) {
    riskLevel = "MEDIUM";
    decision = "STEP_UP";
    recommendedAction = "Trigger additional identity verification (OTP/Biometric)";
  }

  // 6. Calculate Confidence Score
  // confidence = (available_signals / total_signals) * signal_quality_factor
  const totalSignals = 8; // community, sim, geofence, velocity, device_status, account_age, device_id, location
  let availableSignals = 6; // base 6 signals are always provided by our mock/network layer
  if (signals.hasDeviceId) availableSignals++;
  if (signals.hasLocation) availableSignals++;
  
  const confidence = parseFloat((availableSignals / totalSignals).toFixed(2));

  // 7. Generate Explanation
  const activeSignals = [];
  if (signals.simSwapRecent) activeSignals.push("recent SIM swap");
  if (signals.communityReportsCount > 0) activeSignals.push(`${signals.communityReportsCount} community scam reports`);
  if (signals.geofenceAnomaly) activeSignals.push("unusual geofence pattern");
  if (signals.transactionVelocity > 3) activeSignals.push("high transaction velocity");
  
  const explanation = activeSignals.length > 0 
    ? `${riskLevel} risk signal: ${activeSignals.join(", ")} detected.`
    : "No significant risk patterns detected. Transaction appears legitimate.";

  return {
    phone_number: phoneNumber,
    risk_score: riskScore,
    risk_level: riskLevel,
    decision: decision,
    confidence: confidence,
    signals: contributions as TrustSignals,
    recommended_action: recommendedAction,
    explanation: explanation,
    evaluated_at: new Date().toISOString(),
    processing_time_ms: Date.now() - startTime
  };
}
