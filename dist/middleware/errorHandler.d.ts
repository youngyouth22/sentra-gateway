import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
export declare function errorHandler(error: FastifyError | ZodError | any, request: FastifyRequest, reply: FastifyReply): Promise<undefined>;
//# sourceMappingURL=errorHandler.d.ts.map