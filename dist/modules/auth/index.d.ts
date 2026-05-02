export interface SilentVerifyRequest {
    token: string;
    ipAddress?: string;
    ownerId: string;
}
export interface SilentVerifyResult {
    success: boolean;
    phoneNumber?: string;
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
 * Perform Silent Authentication using CAMARA Number Verification.
 */
export declare function silentVerify(request: SilentVerifyRequest): Promise<SilentVerifyResult>;
/**
 * Securely bind a device ID to a phone number.
 * [CVE-5 FIX] Stores phone_number_hash instead of raw phone number.
 */
export declare function bindDevice(request: DeviceBindRequest): Promise<DeviceBindResult>;
//# sourceMappingURL=index.d.ts.map