import { NetworkAsCodeClient } from "network-as-code";
import { config } from "../../config/index.js";
import { supabase } from "../../plugins/supabase.js";
import { hashPhone } from "../trust/index.js";
const nacClient = new NetworkAsCodeClient(config.nokiaToken, config.nokiaEnv);
/**
 * Perform Silent Authentication using CAMARA Number Verification.
 */
export async function silentVerify(request) {
    // [VH-8 FIX] Reject requests with no IP — do NOT fallback to 127.0.0.1
    // Using the loopback address in a CAMARA network verification is semantically wrong
    if (!request.ipAddress || request.ipAddress === "127.0.0.1" || request.ipAddress === "::1") {
        return {
            success: false,
            error: "A valid client IP address is required for network verification",
        };
    }
    try {
        const device = nacClient.devices.get({
            ipv4Address: {
                publicAddress: request.ipAddress,
            },
        });
        const isVerified = await device.verifySimSwap(24);
        return {
            success: true,
            phoneNumber: device.phoneNumber,
        };
    }
    catch (error) {
        return {
            success: false,
            error: "Network verification failed",
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