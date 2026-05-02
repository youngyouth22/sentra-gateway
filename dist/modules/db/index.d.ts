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
declare class PersistentDB {
    saveApiKey(key: ApiKey): Promise<void>;
    getApiKeyByHash(hash: string): Promise<ApiKey | undefined>;
    getApiKeysByUser(userId: string): Promise<ApiKey[]>;
    deleteApiKey(id: string, userId: string): Promise<boolean>;
    updateApiKeyLastUsed(id: string): Promise<void>;
    logUsage(log: Omit<ApiUsageLog, "id">): Promise<void>;
    getUsageByUser(userId: string): Promise<ApiUsageLog[]>;
}
export declare const db: PersistentDB;
export {};
//# sourceMappingURL=index.d.ts.map