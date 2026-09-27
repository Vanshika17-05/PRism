import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4100),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  USE_MOCKS: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  JWT_SECRET: z.string().min(32).default("prism-mock-development-secret-change-me"),
  MONGODB_URI: z.string().optional(),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  GITHUB_APP_CLIENT_ID: z.string().optional(),
  GITHUB_APP_CLIENT_SECRET: z.string().optional(),
  APP_URL: z.string().url().default("http://localhost:4100"),
  OLLAMA_BASE_URL: z.string().url().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().min(1).default("qwen2.5-coder:7b"),
  PYTHON_SERVICE_URL: z.string().url().default("http://127.0.0.1:8100"),
  AI_TIMEOUT_MS: z.coerce.number().int().min(10_000).max(300_000).default(120_000),
  REDIS_URL: z.string().url().default("redis://127.0.0.1:6379"),
  REVIEW_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(2),
  GITHUB_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(60),
  AI_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(12)
}).superRefine((values, context) => {
  if (values.USE_MOCKS) return;
  for (const key of ["MONGODB_URI", "GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY", "GITHUB_WEBHOOK_SECRET"]) {
    if (!values[key]) context.addIssue({ code: "custom", path: [key], message: `${key} is required when USE_MOCKS=false` });
  }
  if (values.GITHUB_WEBHOOK_SECRET && values.GITHUB_WEBHOOK_SECRET.length < 24) {
    context.addIssue({ code: "custom", path: ["GITHUB_WEBHOOK_SECRET"], message: "GITHUB_WEBHOOK_SECRET must be at least 24 characters" });
  }
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const message = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${message}`);
}

export const env = Object.freeze({
  ...parsed.data,
  GITHUB_APP_PRIVATE_KEY: parsed.data.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n")
});
