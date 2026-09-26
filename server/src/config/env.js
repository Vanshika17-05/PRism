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
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),
  PYTHON_SERVICE_URL: z.string().url().default("http://127.0.0.1:8100"),
  AI_TIMEOUT_MS: z.coerce.number().int().min(10_000).max(300_000).default(120_000)
}).superRefine((values, context) => {
  if (values.USE_MOCKS) return;
  for (const key of ["MONGODB_URI", "GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY", "GITHUB_WEBHOOK_SECRET", "OPENAI_API_KEY"]) {
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
