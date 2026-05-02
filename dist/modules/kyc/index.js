import { NetworkAsCodeClient } from "network-as-code";
import { config } from "../../config/index.js";
const nacClient = new NetworkAsCodeClient(config.nokiaToken, config.nokiaEnv);
/**
 * Perform Identity Verification using CAMARA KYC Match API
 */
export async function checkKYC(request) {
    try {
        const device = nacClient.devices.get({ phoneNumber: request.phoneNumber });
        // In a real production SDK, we call the kycMatch functionality
        // Note: implementation details depend on the specific CAMARA provider mapping in the SDK
        const kycResult = await device.verifyKyc({
            name: request.fullName,
            idNumber: request.idNumber
        });
        return {
            verified: kycResult.verified || false,
            matchScore: kycResult.score || 0,
            details: {
                nameMatch: kycResult.nameMatch || false,
                idMatch: kycResult.idMatch || false,
            },
        };
    }
    catch (error) {
        // Fail-safe for sandbox or missing data
        return {
            verified: false,
            matchScore: 0,
            details: { nameMatch: false, idMatch: false }
        };
    }
}
/**
 * Retrieve verified user profile from network operator
 */
export async function autoFillKYC(phoneNumber) {
    try {
        const device = nacClient.devices.get({ phoneNumber });
        // Simulate fetching profile data (Subject to user consent in CAMARA)
        return {
            fullName: "Verified User",
            address: "Network Certified Address",
            email: "verified@operator.com",
            dateOfBirth: "1990-01-01",
        };
    }
    catch (error) {
        throw new Error("Unable to retrieve KYC data from operator");
    }
}
//# sourceMappingURL=index.js.map