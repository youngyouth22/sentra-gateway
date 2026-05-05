import { NetworkAsCodeClient } from "network-as-code";
import { config } from "../../config/index.js";
const nacClient = new NetworkAsCodeClient(config.nokiaToken, config.nokiaEnv);
/**
 * Perform Identity Verification using CAMARA KYC Match API
 */
export async function checkKYC(request) {
    try {
        const device = nacClient.devices.get({ phoneNumber: request.phoneNumber });
        // The CAMARA KYC Match API is exposed via matchCustomer in the SDK
        const kycResult = await device.matchCustomer({
            name: request.fullName,
            idDocument: request.idNumber
        });
        return {
            verified: kycResult.verified || false,
            matchScore: kycResult.matchRate || 0,
            details: {
                nameMatch: kycResult.nameMatch || false,
                idMatch: kycResult.idDocumentMatch || false,
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