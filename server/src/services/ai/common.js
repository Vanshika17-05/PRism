import { z } from "zod";

export const resultSchema = z.object({
  summary: z.string().min(1).max(5000),
  overallRating: z.enum(["approve", "comment", "request_changes"]),
  findings: z
    .array(
      z.object({
        file: z.string().min(1),
        line: z.coerce.number().int().positive(),
        severity: z.enum(["low", "medium", "high"]),
        category: z.enum([
          "bug",
          "security",
          "performance",
          "style",
          "maintainability",
        ]),
        title: z.string().min(1).max(200),
        body: z.string().min(1).max(2000),
        suggestion: z.string().max(4000).optional().default(""),
        confidence: z.coerce.number().min(0).max(100).default(75),
      }),
    )
    .max(100),
});

export function extractJson(text) {
  const clean = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/, "");
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end < start)
    throw new Error("AI provider returned no JSON object");
  return clean.slice(start, end + 1);
}

export function normalizedResult(text, usage = {}) {
  return {
    ...resultSchema.parse(JSON.parse(extractJson(text))),
    usage: { input: usage.input || 0, output: usage.output || 0 },
  };
}

export async function providerFetch(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    if (!response.ok)
      throw Object.assign(
        new Error(`AI provider request failed with ${response.status}`),
        { status: 503 },
      );
    return response.json();
  } catch (error) {
    if (error.name === "AbortError")
      throw Object.assign(new Error("AI provider timed out"), { status: 504 });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
