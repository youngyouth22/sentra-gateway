import { supabase } from "../../plugins/supabase.js";
/**
 * [B2B PERSISTENCE FIX]
 * Migrated from InMemoryDB to Supabase/Postgres.
 * This ensures API keys and usage logs survive server restarts.
 */
class PersistentDB {
    async saveApiKey(key) {
        const { error } = await supabase.from("api_keys").insert({
            id: key.id,
            user_id: key.userId,
            name: key.name,
            key_hash: key.keyHash,
            created_at: key.createdAt,
        });
        if (error)
            throw error;
    }
    async getApiKeyByHash(hash) {
        const { data, error } = await supabase
            .from("api_keys")
            .select("*")
            .eq("key_hash", hash)
            .eq("is_revoked", false)
            .single();
        if (error || !data)
            return undefined;
        return {
            id: data.id,
            userId: data.user_id,
            name: data.name,
            keyHash: data.key_hash,
            createdAt: new Date(data.created_at),
            lastUsedAt: data.last_used_at ? new Date(data.last_used_at) : null,
            isRevoked: data.is_revoked,
        };
    }
    async getApiKeysByUser(userId) {
        const { data, error } = await supabase
            .from("api_keys")
            .select("*")
            .eq("user_id", userId);
        if (error || !data)
            return [];
        return data.map((d) => ({
            id: d.id,
            userId: d.user_id,
            name: d.name,
            keyHash: d.key_hash,
            createdAt: new Date(d.created_at),
            lastUsedAt: d.last_used_at ? new Date(d.last_used_at) : null,
            isRevoked: d.is_revoked,
        }));
    }
    async deleteApiKey(id, userId) {
        const { error } = await supabase
            .from("api_keys")
            .update({ is_revoked: true }) // Soft delete for audit trail
            .eq("id", id)
            .eq("user_id", userId);
        return !error;
    }
    async updateApiKeyLastUsed(id) {
        await supabase
            .from("api_keys")
            .update({ last_used_at: new Date() })
            .eq("id", id);
    }
    async logUsage(log) {
        // Non-blocking fire and forget
        supabase
            .from("api_usage_logs")
            .insert({
            api_key_id: log.apiKeyId,
            user_id: log.userId,
            endpoint: log.endpoint,
            method: log.method,
            status_code: log.statusCode,
            response_time: log.responseTime,
        })
            .then(({ error }) => {
            if (error)
                console.error("[DB] Error logging usage:", error.message);
        });
    }
    async getUsageByUser(userId) {
        const { data, error } = await supabase
            .from("api_usage_logs")
            .select("*")
            .eq("user_id", userId)
            .order("timestamp", { ascending: false });
        if (error || !data)
            return [];
        return data.map((d) => ({
            id: d.id,
            apiKeyId: d.api_key_id,
            userId: d.user_id,
            endpoint: d.endpoint,
            method: d.method,
            statusCode: d.status_code,
            responseTime: d.response_time,
            timestamp: new Date(d.timestamp),
        }));
    }
}
export const db = new PersistentDB();
//# sourceMappingURL=index.js.map