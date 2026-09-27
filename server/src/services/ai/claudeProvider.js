import { env } from "../../config/env.js";
import { buildReviewPrompt } from "../../utils/prompts.js";
import { normalizedResult, providerFetch } from "./common.js";

export async function generateReview(context) {
  if (!env.ANTHROPIC_API_KEY)
    throw Object.assign(new Error("ANTHROPIC_API_KEY is not configured"), {
      status: 503,
    });
  const payload = await providerFetch(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: env.CLAUDE_MODEL,
        max_tokens: 4096,
        temperature: 0.2,
        messages: [{ role: "user", content: buildReviewPrompt(context) }],
      }),
    },
    env.AI_TIMEOUT_MS,
  );
  return normalizedResult(
    payload.content?.find((item) => item.type === "text")?.text || "",
    {
      input: payload.usage?.input_tokens,
      output: payload.usage?.output_tokens,
    },
  );
}
