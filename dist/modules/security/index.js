import { NetworkAsCodeClient } from "network-as-code";
import { config } from "../../config/index.js";
import { evaluateTrust } from "../trust/index.js";
const nacClient = new NetworkAsCodeClient(config.nokiaToken, config.nokiaEnv);
/**
 * Combine Trust Scoring with Transactional Context for Pre-Auth Check
 */
export async function preAuthCheck(request, userId) {
    const trust = await evaluateTrust(request.phoneNumber, userId);
    const isHighAmount = (request.transactionAmount || 0) > 5000;
    let recommendation = "PROCEED";
    if (trust.decision === "BLOCK") {
        recommendation = "BLOCK";
    }
    else if (trust.decision === "STEP_UP_AUTH" || isHighAmount) {
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
 */
export async function checkGeofence(request) {
    try {
        const device = nacClient.devices.get({ phoneNumber: request.phoneNumber });
        const location = await device.getLocation();
        if (!location) {
            throw new Error("Location data unavailable from network");
        }
        const distance = calculateDistance(location.latitude, location.longitude, request.latitude, request.longitude);
        return {
            withinArea: distance <= request.radius,
            distanceFromCenter: Math.round(distance),
        };
    }
    catch (error) {
        return {
            withinArea: false,
            distanceFromCenter: -1,
            error: error.message
        };
    }
}
/**
 * Haversine formula for distance calculation
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // in metres
}
//# sourceMappingURL=index.js.map