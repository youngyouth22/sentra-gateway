export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly details?: any;
    constructor(message: string, statusCode: number, code: string, details?: any);
}
export declare const ErrorCodes: {
    readonly VALIDATION_FAILED: "validation_failed";
    readonly UNAUTHORIZED: "unauthorized";
    readonly FORBIDDEN: "forbidden";
    readonly NOT_FOUND: "not_found";
    readonly RATE_LIMIT_EXCEEDED: "rate_limit_exceeded";
    readonly INTERNAL_SERVER_ERROR: "internal_server_error";
    readonly CONFLICT: "conflict";
    readonly SERVICE_UNAVAILABLE: "service_unavailable";
    readonly BAD_REQUEST: "bad_request";
};
//# sourceMappingURL=errors.d.ts.map