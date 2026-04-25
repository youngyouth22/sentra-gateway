
import { createHash, randomBytes } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index.js";

export function generateApiKey(): string {
  const randomHex = randomBytes(24).toString("hex");
  return `sentra_${randomHex}`;
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function createApiKeyForUser(userId: string, name: string) {
  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);
  
  const apiKey = {
    id: uuidv4(),
    userId,
    name,
    keyHash,
    createdAt: new Date(),
    lastUsedAt: null,
  };

  await db.saveApiKey(apiKey);

  return {
    ...apiKey,
    rawKey, // Only returned once
  };
}

export async function verifyApiKey(rawKey: string) {
  const hash = hashApiKey(rawKey);
  const apiKey = await db.getApiKeyByHash(hash);
  
  if (apiKey) {
    await db.updateApiKeyLastUsed(apiKey.id);
  }
  
  return apiKey;
}

export async function listUserApiKeys(userId: string) {
  return db.getApiKeysByUser(userId);
}

export async function revokeApiKey(id: string, userId: string) {
  return db.deleteApiKey(id, userId);
}
