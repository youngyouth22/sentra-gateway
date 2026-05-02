import { db } from "../modules/db/index.js";
export function usageTracker(fastify) {
    fastify.addHook("onResponse", async (request, reply) => {
        // [CVE-6 FIX] Was checking `request.user` which doesn't exist — corrected to `request.sentraUser`
        if (!request.sentraUser || !request.apiKeyId) {
            return;
        }
        const log = {
            apiKeyId: request.apiKeyId,
            // [CVE-6 FIX] Correct property reference
            userId: request.sentraUser.uid,
            // [VH-7] Strip query params from URL to avoid logging sensitive query parameters
            endpoint: request.url.split("?")[0],
            method: request.method,
            statusCode: reply.statusCode,
            responseTime: reply.elapsedTime,
            timestamp: new Date(),
        };
        // Non-blocking save — failure to log must never impact the response
        db.logUsage(log).catch((err) => {
            fastify.log.error({ err }, "Failed to log API usage");
        });
    });
}
//# sourceMappingURL=usageTracker.js.map