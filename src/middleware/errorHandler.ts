import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError, ErrorCodes } from "../utils/errors.js";
import crypto from "node:crypto";

export async function errorHandler(
  error: FastifyError | ZodError | AppError | any,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Generate a unique reference ID for tracking
  const referenceId = crypto.randomUUID();

  // Log the error with request context and reference ID
  request.log.error({ err: error, referenceId }, "Error occurred");

  const isDevelopment = process.env.NODE_ENV === "development";

  // Handle Zod Validation Errors
  if (error instanceof ZodError) {
    return reply.status(400).send({
      statusCode: 400,
      code: ErrorCodes.VALIDATION_FAILED,
      message: "Validation failed",
      details: error.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
      referenceId,
    });
  }

  // Handle Custom App Errors
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      details: error.details,
      referenceId,
    });
  }

  // Handle Fastify/Standard Errors
  const statusCode = error.statusCode || 500;
  let message = error.message || "Internal Server Error";
  let code: string = ErrorCodes.INTERNAL_SERVER_ERROR;

  // Map common HTTP status codes to custom error codes
  if (statusCode === 401) code = ErrorCodes.UNAUTHORIZED;
  if (statusCode === 403) code = ErrorCodes.FORBIDDEN;
  if (statusCode === 404) code = ErrorCodes.NOT_FOUND;
  if (statusCode === 429) code = ErrorCodes.RATE_LIMIT_EXCEEDED;
  if (statusCode === 400) code = ErrorCodes.BAD_REQUEST;

  // Do not expose internal messages in production for 500s
  if (!isDevelopment && statusCode === 500) {
    message = "An unexpected error occurred. Please contact support with the reference ID.";
  }

  const response: any = {
    statusCode,
    code,
    message,
    referenceId,
  };

  if (isDevelopment && error.stack) {
    response.stack = error.stack;
  }

  reply.status(statusCode).send(response);
}

