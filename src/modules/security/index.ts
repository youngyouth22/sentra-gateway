
import { NetworkAsCodeClient } from "network-as-code";
import { config } from "../../config/index.js";
import { evaluateTrust } from "../trust/index.js";

const nacClient = new NetworkAsCodeClient(config.nokiaToken, config.nokiaEnv);

export interface PreAuthCheckRequest {
  phoneNumber: string;
  transactionAmount?: number;
}

export interface PreAuthCheckResult {
  safe: boolean;
  riskScore: number;
  recommendation: "PROCEED" | "CHALLENGE" | "BLOCK";
  trustDecision: string;
}

export interface GeofenceRequest {
  phoneNumber: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export interface GeofenceResult {
  withinArea: boolean;
  distanceFromCenter: number;
  error?: string;
}

/**
 * Combine Trust Scoring with Transactional Context for Pre-Auth Check
 */
export async function preAuthCheck(request: PreAuthCheckRequest, userId: string): Promise<PreAuthCheckResult> {
  const trust = await evaluateTrust(request.phoneNumber, userId);
  
  const isHighAmount = (request.transactionAmount || 0) > 5000;
  let recommendation: "PROCEED" | "CHALLENGE" | "BLOCK" = "PROCEED";

  if (trust.decision === "BLOCK") {
    recommendation = "BLOCK";
  } else if (trust.decision === "STEP_UP_AUTH" || isHighAmount) {
    recommendation = "CHALLENGE";
  }

  return {
    safe: recommendation !== "BLOCK",
    riskScore: (100 - trust.trustScore) / 100,
    recommendation,
    trustDecision: trust.decision
  };
}

/**
 * Verify device location using Network-Level Geofencing (Anti-Spoofing)
 * Uses the proper Location Verification API instead of Location Retrieval
 * to preserve user privacy (no coordinates exposed) and ensure high security.
 */
export async function checkGeofence(request: GeofenceRequest): Promise<GeofenceResult> {
  try {
    const device = nacClient.devices.get({ phoneNumber: request.phoneNumber });
    
    // The NaC SDK exposes verifyLocation which does the distance calculation securely on the telecom network side
    const verification = await device.verifyLocation(
      request.latitude,
      request.longitude,
      request.radius
    );

    if (!verification) {
        throw new Error("Location verification unavailable from network");
    }

    return {
      withinArea: verification.resultType === 'TRUE' || verification.resultType === 'PARTIAL',
      distanceFromCenter: -1, // Not exposed for privacy reasons
    };
  } catch (error: any) {
    return {
      withinArea: false,
      distanceFromCenter: -1,
      error: error.message
    };
  }
}


