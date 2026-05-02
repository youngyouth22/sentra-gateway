import { randomBytes, createHash } from "node:crypto";

export const cryptoUtils = {

  generateApiKey: (prefix: string = "sentra_live"): string => {
    const randomString = randomBytes(24).toString("hex");
    return `${prefix}_${randomString}`;
  },

  
  hashKey: (key: string): string => {
    return createHash("sha256").update(key).digest("hex");
  },
};
