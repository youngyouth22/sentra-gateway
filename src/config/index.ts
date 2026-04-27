import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// Validates that webhook URLs use HTTPS and are not internal/loopback addresses (SSRF protection)
function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "169.254.169.254"];
    if (blockedHosts.includes(parsed.hostname)) return false;
    // Block private IP ranges
    const privateRanges = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/;
    if (privateRanges.test(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

const envSchema = z.object({
  PORT: z.string().default("3000").transform(Number),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  // [CVE-2] JWT_SECRET is now REQUIRED with minimum 32 chars — no insecure default
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters for security"),
  API_KEY: z.string().min(1, "API_KEY is required"),
  NOKIA_API_KEY: z.string().min(1, "NOKIA_API_KEY is required"),
  NOKIA_ENV: z.string().default("dev"),
  NOKIA_BASE_URL: z
    .string()
    .url()
    .default("https://sandbox.api.nokia-as-code.com"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_KEY: z.string().min(1, "SUPABASE_KEY is required"),
  // CORS — only explicit origins allowed in production
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  // Body size limit in bytes (default 1MB)
  BODY_LIMIT: z.string().default("1048576").transform(Number),
  // Webhook URLs — optional, validated for SSRF if provided
  WEBHOOK_TRUST_ALERT_URL: z
    .string()
    .optional()
    .refine((v) => !v || isValidWebhookUrl(v), {
      message: "WEBHOOK_TRUST_ALERT_URL must be a valid HTTPS URL (no private/internal addresses)",
    }),
  WEBHOOK_TRANSACTION_BLOCKED_URL: z
    .string()
    .optional()
    .refine((v) => !v || isValidWebhookUrl(v), {
      message: "WEBHOOK_TRANSACTION_BLOCKED_URL must be a valid HTTPS URL",
    }),
  WEBHOOK_TRANSACTION_STEP_UP_URL: z
    .string()
    .optional()
    .refine((v) => !v || isValidWebhookUrl(v), {
      message: "WEBHOOK_TRANSACTION_STEP_UP_URL must be a valid HTTPS URL",
    }),
  WEBHOOK_ESCROW_CREATED_URL: z
    .string()
    .optional()
    .refine((v) => !v || isValidWebhookUrl(v), {
      message: "WEBHOOK_ESCROW_CREATED_URL must be a valid HTTPS URL",
    }),
  WEBHOOK_ESCROW_RELEASED_URL: z
    .string()
    .optional()
    .refine((v) => !v || isValidWebhookUrl(v), {
      message: "WEBHOOK_ESCROW_RELEASED_URL must be a valid HTTPS URL",
    }),
});

const envServer = envSchema.safeParse(process.env);

if (!envServer.success) {
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(envServer.error.format(), null, 2),
  );
  process.exit(1);
}

export const config = {
  port: envServer.data.PORT,
  nodeEnv: envServer.data.NODE_ENV,
  apiKey: envServer.data.API_KEY,
  nokiaToken: envServer.data.NOKIA_API_KEY,
  nokiaEnv: envServer.data.NOKIA_ENV,
  nokiaBaseUrl: envServer.data.NOKIA_BASE_URL,
  jwtSecret: envServer.data.JWT_SECRET,
  logLevel: envServer.data.LOG_LEVEL,
  supabaseUrl: envServer.data.SUPABASE_URL,
  supabaseKey: envServer.data.SUPABASE_KEY,
  corsOrigin: envServer.data.CORS_ORIGIN,
  bodyLimit: envServer.data.BODY_LIMIT,
  webhooks: {
    trustAlert: envServer.data.WEBHOOK_TRUST_ALERT_URL,
    transactionBlocked: envServer.data.WEBHOOK_TRANSACTION_BLOCKED_URL,
    transactionStepUp: envServer.data.WEBHOOK_TRANSACTION_STEP_UP_URL,
    escrowCreated: envServer.data.WEBHOOK_ESCROW_CREATED_URL,
    escrowReleased: envServer.data.WEBHOOK_ESCROW_RELEASED_URL,
  },
  isProduction: envServer.data.NODE_ENV === "production",
  isDevelopment: envServer.data.NODE_ENV === "development",
};
