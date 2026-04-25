import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("3000").transform(Number),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  API_KEY: z.string().min(1, "API_KEY is required"),
  NOKIA_API_KEY: z.string().min(1, "NOKIA_API_KEY is required"),
  NOKIA_ENV: z.string().default("dev"),
  NOKIA_BASE_URL: z
    .string()
    .url()
    .default("https://sandbox.api.nokia-as-code.com"),
  JWT_SECRET: z.string().default("super-secret-key-change-me-in-production"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_KEY: z.string().min(1, "SUPABASE_KEY is required"),
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
};
