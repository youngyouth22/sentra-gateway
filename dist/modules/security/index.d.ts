export interface PreAuthCheckRequest {
    phoneNumber: string;
    transactionAmount?: number;
}
export interface PreAuthCheckResult {
    safe: boolean;
    riskScore: number;
    recommendation: "PROCEED" | "CHALLENGE" | "BLOCK";
    trustDecision: string;
}
export interface GeofenceRequest {
    phoneNumber: string;
    latitude: number;
    longitude: number;
    radius: number;
}
export interface GeofenceResult {
    withinArea: boolean;
    distanceFromCenter: number;
    error?: string;
}
/**
 * Combine Trust Scoring with Transactional Context for Pre-Auth Check
 */
export declare function preAuthCheck(request: PreAuthCheckRequest, userId: string): Promise<PreAuthCheckResult>;
/**
 * Verify device location using Network-Level Geofencing (Anti-Spoofing)
 */
export declare function checkGeofence(request: GeofenceRequest): Promise<GeofenceResult>;
//# sourceMappingURL=index.d.ts.map