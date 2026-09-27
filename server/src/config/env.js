import "dotenv/config";
import path from "node:path";
import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4100),
    CLIENT_URL: z.string().url().default("http://localhost:5173"),
    USE_MOCKS: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    JWT_SECRET: z
      .string()
      .min(32)
      .default("prism-mock-development-secret-change-me"),
    MONGODB_URI: z.string().optional(),
    GITHUB_APP_ID: z.string().optional(),
    GITHUB_APP_PRIVATE_KEY: z.string().optional(),
    GITHUB_WEBHOOK_SECRET: z.string().optional(),
    GITHUB_APP_CLIENT_ID: z.string().optional(),
    GITHUB_APP_CLIENT_SECRET: z.string().optional(),
    GITHUB_APP_SLUG: z
      .string()
      .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/)
      .optional(),
    APP_URL: z.string().url().default("http://localhost:4100"),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
    ANTHROPIC_API_KEY: z.string().optional(),
    CLAUDE_MODEL: z.string().default("claude-3-5-haiku-latest"),
    PYTHON_SERVICE_URL: z.string().url().default("http://127.0.0.1:8100"),
    AI_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(10_000)
      .max(300_000)
      .default(120_000),
    REDIS_URL: z.string().url().default("redis://127.0.0.1:6379"),
    REVIEW_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(2),
    GITHUB_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(60),
    AI_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(12),
    ANALYTICS_DB_PATH: z
      .string()
      .default(path.resolve(process.cwd(), "data/analytics.sqlite")),
    USE_S3: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_REGION: z.string().default("us-east-1"),
    AWS_S3_BUCKET: z.string().optional(),
    LOCAL_STORAGE_DIR: z
      .string()
      .default(path.resolve(process.cwd(), "data/storage")),
  })
  .superRefine((values, context) => {
    if (values.USE_MOCKS) return;
    for (const key of [
      "MONGODB_URI",
      "GITHUB_APP_ID",
      "GITHUB_APP_PRIVATE_KEY",
      "GITHUB_WEBHOOK_SECRET",
    ]) {
      if (!values[key])
        context.addIssue({
          code: "custom",
          path: [key],
          message: `${key} is required when USE_MOCKS=false`,
        });
    }
    if (
      values.GITHUB_WEBHOOK_SECRET &&
      values.GITHUB_WEBHOOK_SECRET.length < 24
    ) {
      context.addIssue({
        code: "custom",
        path: ["GITHUB_WEBHOOK_SECRET"],
        message: "GITHUB_WEBHOOK_SECRET must be at least 24 characters",
      });
    }
    if (values.USE_S3)
      for (const key of [
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "AWS_S3_BUCKET",
      ]) {
        if (!values[key])
          context.addIssue({
            code: "custom",
            path: [key],
            message: `${key} is required when USE_S3=true`,
          });
      }
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const message = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${message}`);
}

export const env = Object.freeze({
  ...parsed.data,
  GITHUB_APP_PRIVATE_KEY: parsed.data.GITHUB_APP_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  ),
});
