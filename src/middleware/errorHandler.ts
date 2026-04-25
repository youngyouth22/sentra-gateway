import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

export async function errorHandler(
  error: FastifyError | ZodError | any,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Log the error with request context
  request.log.error(error);

  const isDevelopment = process.env.NODE_ENV === "development";

  // Handle Zod Validation Errors
  if (error instanceof ZodError) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      details: error.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
  }

  // Handle Fastify/Standard Errors
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";

  const response: any = {
    statusCode,
    error: error.name || "InternalServerError",
    message,
  };

  if (isDevelopment && error.stack) {
    response.stack = error.stack;
  }

  reply.status(statusCode).send(response);
}

