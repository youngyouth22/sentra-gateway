import { supabase } from "../../plugins/supabase.js";

// Interfaces for our collections
export interface User {
  id: string;
  email: string;
  createdAt: Date;
}

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyHash: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  isRevoked?: boolean;
}

export interface ApiUsageLog {
  id: string;
  apiKeyId: string;
  userId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
}

/**
 * [B2B PERSISTENCE FIX]
 * Migrated from InMemoryDB to Supabase/Postgres.
 * This ensures API keys and usage logs survive server restarts.
 */
class PersistentDB {
  async saveApiKey(key: ApiKey): Promise<void> {
    const { error } = await supabase.from("api_keys").insert({
      id: key.id,
      user_id: key.userId,
      name: key.name,
      key_hash: key.keyHash,
      created_at: key.createdAt,
    });
    if (error) throw error;
  }

  async getApiKeyByHash(hash: string): Promise<ApiKey | undefined> {
    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .eq("key_hash", hash)
      .eq("is_revoked", false)
      .single();

    if (error || !data) return undefined;

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

  async getApiKeysByUser(userId: string): Promise<ApiKey[]> {
    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .eq("user_id", userId);

    if (error || !data) return [];

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

  async deleteApiKey(id: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from("api_keys")
      .update({ is_revoked: true }) // Soft delete for audit trail
      .eq("id", id)
      .eq("user_id", userId);

    return !error;
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    await supabase
      .from("api_keys")
      .update({ last_used_at: new Date() })
      .eq("id", id);
  }

  async logUsage(log: Omit<ApiUsageLog, "id">): Promise<void> {
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
        if (error) console.error("[DB] Error logging usage:", error.message);
      });
  }

  async getUsageByUser(userId: string): Promise<ApiUsageLog[]> {
    const { data, error } = await supabase
      .from("api_usage_logs")
      .select("*")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false });

    if (error || !data) return [];

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
