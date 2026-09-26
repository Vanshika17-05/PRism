import { z } from "zod";
import { env } from "../config/env.js";
import { buildReviewPrompt } from "../utils/prompts.js";

const resultSchema = z.object({
  summary: z.string().min(1).max(5000),
  overallRating: z.enum(["approve", "comment", "request_changes"]),
  findings: z.array(z.object({
    file: z.string().min(1), line: z.coerce.number().int().positive(), severity: z.enum(["low", "medium", "high"]),
    category: z.enum(["bug", "security", "performance", "style", "maintainability"]), title: z.string().min(1).max(200),
    body: z.string().min(1).max(2000), suggestion: z.string().max(4000).optional().default(""), confidence: z.coerce.number().min(0).max(100).default(75)
  })).max(100)
});

function extractJson(text) {
  const clean = text.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  const start = clean.indexOf("{"); const end = clean.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Local AI returned no JSON object");
  return clean.slice(start, end + 1);
}

export async function reviewWithAi(context) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);
  try {
    const response = await fetch(`${env.OLLAMA_BASE_URL}/api/generate`, { method: "POST", signal: controller.signal, headers: { "content-type": "application/json" }, body: JSON.stringify({ model: env.OLLAMA_MODEL, prompt: buildReviewPrompt(context), stream: false, format: "json", options: { temperature: 0.2 } }) });
    if (!response.ok) throw Object.assign(new Error(`Ollama request failed with ${response.status}`), { status: 503 });
    const payload = await response.json(); const parsed = resultSchema.parse(JSON.parse(extractJson(payload.response || "")));
    return { ...parsed, usage: { input: payload.prompt_eval_count || 0, output: payload.eval_count || 0 } };
  } catch (error) {
    if (error.name === "AbortError") throw Object.assign(new Error("Local Ollama review timed out"), { status: 504 });
    throw error;
  } finally { clearTimeout(timer); }
}
