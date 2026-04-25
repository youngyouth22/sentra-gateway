import dotenv from "dotenv";
dotenv.config();
export const config = {
    port: parseInt(process.env.PORT || "3000", 10),
    nodeEnv: process.env.NODE_ENV || "development",
    apiKey: process.env.API_KEY || "default-key",
    nokiaToken: process.env.NOKIA_API_KEY || "",
    nokiaEnv: process.env.NOKIA_ENV || "dev",
    nokiaBaseUrl: process.env.NOKIA_BASE_URL || "https://sandbox.api.nokia-as-code.com",
    logLevel: process.env.LOG_LEVEL || "info",
};
//# sourceMappingURL=index.js.map