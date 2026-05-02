import { randomBytes, createHash } from "node:crypto";
export const cryptoUtils = {
    /**
     * Génère une clé API sécurisée avec un préfixe
     * Format: sentra_live_[random_string]
     */
    generateApiKey: (prefix = "sentra_live") => {
        const randomString = randomBytes(24).toString("hex");
        return `${prefix}_${randomString}`;
    },
    /**
     * Hash une clé pour le stockage en base de données
     * (On ne stocke jamais les clés API en clair !)
     */
    hashKey: (key) => {
        return createHash("sha256").update(key).digest("hex");
    },
};
//# sourceMappingURL=crypto.js.map