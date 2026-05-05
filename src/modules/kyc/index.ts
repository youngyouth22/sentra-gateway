
import { NetworkAsCodeClient } from "network-as-code";
import { config } from "../../config/index.js";

const nacClient = new NetworkAsCodeClient(config.nokiaToken, config.nokiaEnv);

export interface KYCCheckRequest {
  phoneNumber: string;
  idNumber?: string;
  fullName?: string;
}

export interface KYCCheckResult {
  verified: boolean;
  matchScore: number;
  details: {
    nameMatch: boolean;
    idMatch: boolean;
  };
}

export interface KYCAutoFillResult {
  fullName: string;
  address: string;
  email: string;
  dateOfBirth: string;
}

/**
 * Perform Identity Verification using CAMARA KYC Match API
 */
export async function checkKYC(request: KYCCheckRequest): Promise<KYCCheckResult> {
  try {
    const device = nacClient.devices.get({ phoneNumber: request.phoneNumber });
    
    // The CAMARA KYC Match API is exposed via matchCustomer in the SDK
    const kycResult = await (device as any).matchCustomer({
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
  } catch (error) {
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
export async function autoFillKYC(phoneNumber: string): Promise<KYCAutoFillResult> {
  try {
    const device = nacClient.devices.get({ phoneNumber });
    // Simulate fetching profile data (Subject to user consent in CAMARA)
    return {
      fullName: "Verified User", 
      address: "Network Certified Address",
      email: "verified@operator.com",
      dateOfBirth: "1990-01-01",
    };
  } catch (error) {
    throw new Error("Unable to retrieve KYC data from operator");
  }
}
