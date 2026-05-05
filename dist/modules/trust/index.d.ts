export interface TrustSignals {
    simSwap: boolean;
    deviceChanged: boolean;
    roaming: boolean;
    callForwarding: boolean;
    unreachable: boolean;
}
export interface TrustResult {
    trustScore: number;
    globalNexusScore: number;
    riskLevel: "low" | "medium" | "high";
    decision: "ALLOW" | "STEP_UP_AUTH" | "BLOCK";
    signals: TrustSignals;
    reasons: string[];
}
/**
 * Hash phone number for anonymous collective intelligence storage.
 * Exported so other modules (auth) can use the same hashing strategy consistently.
 * [CVE-5] SHA-256 one-way hash — raw phone number never stored
 */
export declare function hashPhone(phoneNumber: string): string;
export declare function evaluateTrust(phoneNumber: string, userId: string): Promise<TrustResult>;
export declare function reportFraud(phoneNumber: string, clientId: string, type: string, severity: number, description: string): Promise<{
    success: boolean;
    error?: undefined;
} | {
    success: boolean;
    error: string;
}>;
//# sourceMappingURL=index.d.ts.map