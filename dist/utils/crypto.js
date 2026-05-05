import { randomBytes, createHash } from "node:crypto";
export const cryptoUtils = {
    generateApiKey: (prefix = "sentra_live") => {
        const randomString = randomBytes(24).toString("hex");
        return `${prefix}_${randomString}`;
    },
    hashKey: (key) => {
        return createHash("sha256").update(key).digest("hex");
    },
};
//# sourceMappingURL=crypto.js.map