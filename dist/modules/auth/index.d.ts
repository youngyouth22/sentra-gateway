export interface InitSilentVerifyRequest {
    phoneNumber: string;
    redirectUri: string;
}
export interface InitSilentVerifyResult {
    authorizationUrl: string;
    state: string;
}
export interface VerifySilentVerifyRequest {
    phoneNumber: string;
    code: string;
    state: string;
}
export interface VerifySilentVerifyResult {
    success: boolean;
    verified: boolean;
    error?: string;
}
export interface DeviceBindRequest {
    deviceId: string;
    phoneNumber: string;
    ownerId: string;
}
export interface DeviceBindResult {
    success: boolean;
    bindingId: string;
}
/**
 * Initialize Silent Authentication using CAMARA Number Verification.
 * Returns the authorization URL to redirect the user's cellular device to.
 */
export declare function initSilentVerify(request: InitSilentVerifyRequest): Promise<InitSilentVerifyResult>;
/**
 * Complete Silent Authentication using the access code and state.
 */
export declare function silentVerify(request: VerifySilentVerifyRequest): Promise<VerifySilentVerifyResult>;
/**
 * Securely bind a device ID to a phone number.
 * [CVE-5 FIX] Stores phone_number_hash instead of raw phone number.
 */
export declare function bindDevice(request: DeviceBindRequest): Promise<DeviceBindResult>;
//# sourceMappingURL=index.d.ts.map