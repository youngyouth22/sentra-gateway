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
export declare function checkKYC(request: KYCCheckRequest): Promise<KYCCheckResult>;
/**
 * Retrieve verified user profile from network operator
 */
export declare function autoFillKYC(phoneNumber: string): Promise<KYCAutoFillResult>;
//# sourceMappingURL=index.d.ts.map