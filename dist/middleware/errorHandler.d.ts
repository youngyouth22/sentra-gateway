import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.js";
export declare function errorHandler(error: FastifyError | ZodError | AppError | any, request: FastifyRequest, reply: FastifyReply): Promise<undefined>;
//# sourceMappingURL=errorHandler.d.ts.map