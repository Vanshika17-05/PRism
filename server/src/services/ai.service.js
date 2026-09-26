import { z } from "zod";
import { env } from "../config/env.js";
import { buildReviewPrompt } from "../utils/prompts.js";
import OpenAI from "openai";

const resultSchema = z.object({
  summary: z.string().min(1).max(5000),
  overallRating: z.enum(["approve", "comment", "request_changes"]),
  findings: z.array(z.object({
    file: z.string().min(1), line: z.coerce.number().int().positive(), severity: z.enum(["low", "medium", "high"]),
    category: z.enum(["bug", "security", "performance", "style", "maintainability"]), title: z.string().min(1).max(200),
    body: z.string().min(1).max(2000), suggestion: z.string().max(4000).optional().default(""),
    confidence: z.coerce.number().min(0).max(100).default(75)
  })).max(100)
});

let client;
const openai = () => (client ||= new OpenAI({ apiKey: env.OPENAI_API_KEY }));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function reviewWithAi(context) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await openai().chat.completions.create({
        model: env.OPENAI_MODEL, temperature: 0.2, response_format: { type: "json_object" },
        messages: [{ role: "system", content: "You are PRism, a precise senior code reviewer. Return only valid JSON." }, { role: "user", content: buildReviewPrompt(context) }]
      }, { timeout: env.AI_TIMEOUT_MS });
      const parsed = resultSchema.parse(JSON.parse(response.choices[0]?.message?.content || "{}"));
      return { ...parsed, usage: { input: response.usage?.prompt_tokens || 0, output: response.usage?.completion_tokens || 0 } };
    } catch (error) {
      lastError = error;
      if (![429, 500, 502, 503, 504].includes(error.status) || attempt === 2) throw error;
      await wait(500 * (2 ** attempt));
    }
  }
  throw lastError;
}
