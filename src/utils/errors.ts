export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, statusCode: number, code: string, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const ErrorCodes = {
  VALIDATION_FAILED: "validation_failed",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not_found",
  RATE_LIMIT_EXCEEDED: "rate_limit_exceeded",
  INTERNAL_SERVER_ERROR: "internal_server_error",
  CONFLICT: "conflict",
  SERVICE_UNAVAILABLE: "service_unavailable",
  BAD_REQUEST: "bad_request"
} as const;
