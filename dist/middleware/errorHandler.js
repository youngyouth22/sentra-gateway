export async function errorHandler(error, request, reply) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    // Log the error
    request.log.error(error);
    // In production, don't expose stack traces
    const isDevelopment = process.env.NODE_ENV === "development";
    const response = {
        statusCode,
        error: error.name || "InternalServerError",
        message,
    };
    if (isDevelopment && error.stack) {
        response.stack = error.stack;
    }
    reply.status(statusCode).send(response);
}
//# sourceMappingURL=errorHandler.js.map