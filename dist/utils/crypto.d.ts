export declare const cryptoUtils: {
    /**
     * Génère une clé API sécurisée avec un préfixe
     * Format: sentra_live_[random_string]
     */
    generateApiKey: (prefix?: string) => string;
    /**
     * Hash une clé pour le stockage en base de données
     * (On ne stocke jamais les clés API en clair !)
     */
    hashKey: (key: string) => string;
};
//# sourceMappingURL=crypto.d.ts.map