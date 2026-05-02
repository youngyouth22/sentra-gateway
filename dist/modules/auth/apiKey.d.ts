export declare function generateApiKey(): string;
export declare function hashApiKey(key: string): string;
export declare function createApiKeyForUser(userId: string, name: string): Promise<{
    rawKey: string;
    id: string;
    userId: string;
    name: string;
    keyHash: string;
    createdAt: Date;
    lastUsedAt: null;
}>;
export declare function verifyApiKey(rawKey: string): Promise<import("../db/index.js").ApiKey | undefined>;
export declare function listUserApiKeys(userId: string): Promise<import("../db/index.js").ApiKey[]>;
export declare function revokeApiKey(id: string, userId: string): Promise<boolean>;
//# sourceMappingURL=apiKey.d.ts.map