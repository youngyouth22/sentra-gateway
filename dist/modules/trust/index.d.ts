export interface TrustSignals {
    simSwap: boolean;
    deviceChanged: boolean;
    roaming: boolean;
}
export interface TrustResult {
    trustScore: number;
    riskLevel: "low" | "medium" | "high";
    decision: "ALLOW" | "STEP_UP_AUTH" | "BLOCK";
    signals: TrustSignals;
    reasons: string[];
}
export declare function evaluateTrust(phoneNumber: string): Promise<TrustResult>;
//# sourceMappingURL=index.d.ts.map