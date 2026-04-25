
import { v4 as uuidv4 } from "uuid";

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

// In-memory storage fallback
class InMemoryDB {
  users: Map<string, User> = new Map();
  apiKeys: Map<string, ApiKey> = new Map();
  usageLogs: ApiUsageLog[] = [];

  async saveUser(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async saveApiKey(key: ApiKey): Promise<void> {
    this.apiKeys.set(key.id, key);
  }

  async getApiKeyByHash(hash: string): Promise<ApiKey | undefined> {
    return Array.from(this.apiKeys.values()).find(k => k.keyHash === hash);
  }

  async getApiKeysByUser(userId: string): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values()).filter(k => k.userId === userId);
  }

  async deleteApiKey(id: string, userId: string): Promise<boolean> {
    const key = this.apiKeys.get(id);
    if (key && key.userId === userId) {
      return this.apiKeys.delete(id);
    }
    return false;
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    const key = this.apiKeys.get(id);
    if (key) {
      key.lastUsedAt = new Date();
    }
  }

  async logUsage(log: Omit<ApiUsageLog, "id">): Promise<void> {
    const id = uuidv4();
    this.usageLogs.push({ ...log, id });
  }

  async getUsageByUser(userId: string): Promise<ApiUsageLog[]> {
    return this.usageLogs.filter(log => log.userId === userId);
  }
}

export const db = new InMemoryDB();
