import { NetworkAsCodeClient } from "network-as-code";
import { config } from "../../config/index.js";
import { triggerTrustAlert } from "../../utils/webhookDispatcher.js";
const nacClient = new NetworkAsCodeClient(config.nokiaToken, config.nokiaEnv);
export async function evaluateTrust(phoneNumber) {
    // Call Nokia as Code APIs
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
    // Compute score
    let score = 100;
    const reasons = [];
    if (signals.simSwap) {
        score -= 40;
        reasons.push("SIM card was recently swapped");
    }
    if (signals.deviceChanged) {
        score -= 25;
        reasons.push("Device has changed");
    }
    if (signals.roaming) {
        score -= 20;
        reasons.push("Device is roaming");
    }
    // Determine risk level and decision
    let riskLevel;
    let decision;
    if (score > 85) {
        riskLevel = "low";
        decision = "ALLOW";
    }
    else if (score >= 40) {
        riskLevel = "medium";
        decision = "STEP_UP_AUTH";
    }
    else {
        riskLevel = "high";
        decision = "BLOCK";
    }
    // Trigger webhook if high risk
    if (score < 40) {
        // Fire and forget
        triggerTrustAlert({ phoneNumber, trustScore: score, signals, reasons });
    }
    return {
        trustScore: score,
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
    catch (error) {
        console.error("Error fetching sim swap status:", error);
        return { swapped: false };
    }
}
async function getDeviceStatus(phoneNumber) {
    try {
        const device = nacClient.devices.get({ phoneNumber });
        const changed = await device.verifyDeviceSwap(24);
        return { changed: Boolean(changed) };
    }
    catch (error) {
        console.error("Error fetching device status:", error);
        return { changed: false };
    }
}
async function getLocationStatus(phoneNumber) {
    try {
        const device = nacClient.devices.get({ phoneNumber });
        const roamingResult = await device.getRoaming();
        const roaming = typeof roamingResult === "boolean"
            ? roamingResult
            : Boolean(roamingResult.roaming ||
                roamingResult.roamingStatus ||
                roamingResult.status ||
                roamingResult.isRoaming ||
                false);
        return { roaming };
    }
    catch (error) {
        console.error("Error fetching location status:", error);
        return { roaming: false };
    }
}
//# sourceMappingURL=index.js.map