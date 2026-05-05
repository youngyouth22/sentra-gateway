import { NetworkAsCodeClient } from "network-as-code";
import { config } from "../../config/index.js";
import { supabase } from "../../plugins/supabase.js";
import { hashPhone } from "../trust/index.js";
const nacClient = new NetworkAsCodeClient(config.nokiaToken, config.nokiaEnv);
import { randomUUID } from "crypto";
/**
 * Initialize Silent Authentication using CAMARA Number Verification.
 * Returns the authorization URL to redirect the user's cellular device to.
 */
export async function initSilentVerify(request) {
    const state = randomUUID();
    // CAMARA standard scope for Number Verification
    const scope = "dpv:FraudPreventionAndDetection number-verification:verify";
    const authorizationUrl = await nacClient.authorization.createAuthorizationLink(request.redirectUri, scope, request.phoneNumber, state);
    return { authorizationUrl, state };
}
/**
 * Complete Silent Authentication using the access code and state.
 */
export async function silentVerify(request) {
    try {
        const device = nacClient.devices.get({
            phoneNumber: request.phoneNumber,
        });
        // The SDK exchanges the code for a token and verifies the number automatically
        const isVerified = await device.verifyNumber(request.code, request.state);
        return {
            success: true,
            verified: isVerified,
        };
    }
    catch (error) {
        return {
            success: false,
            verified: false,
            error: "Number verification failed. Code may be invalid or expired.",
        };
    }
}
/**
 * Securely bind a device ID to a phone number.
 * [CVE-5 FIX] Stores phone_number_hash instead of raw phone number.
 */
export async function bindDevice(request) {
    // [CVE-5 FIX] Hash the phone number — never store PII in plaintext in device_bindings
    const phoneHash = hashPhone(request.phoneNumber);
    const { error } = await supabase
        .from("device_bindings")
        .upsert({
        phone_number_hash: phoneHash,
        device_id: request.deviceId,
        owner_id: request.ownerId, // [CVE-3 FIX] Binding is scoped to the authenticated user
        last_used: new Date(),
    }, { onConflict: "phone_number_hash,device_id" });
    if (error) {
        throw new Error("Device binding failed");
    }
    return {
        success: true,
        bindingId: request.deviceId,
    };
}
//# sourceMappingURL=index.js.map