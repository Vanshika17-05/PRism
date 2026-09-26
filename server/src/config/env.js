import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4100),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  GITHUB_APP_ID: z.string().min(1, "GITHUB_APP_ID is required"),
  GITHUB_APP_PRIVATE_KEY: z.string().min(1, "GITHUB_APP_PRIVATE_KEY is required"),
  GITHUB_WEBHOOK_SECRET: z.string().min(24, "GITHUB_WEBHOOK_SECRET must be at least 24 characters"),
  OLLAMA_BASE_URL: z.string().url().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().min(1).default("qwen2.5-coder:7b"),
  AI_TIMEOUT_MS: z.coerce.number().int().min(10_000).max(300_000).default(120_000)
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const message = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${message}`);
}

export const env = Object.freeze({
  ...parsed.data,
  GITHUB_APP_PRIVATE_KEY: parsed.data.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n")
});
