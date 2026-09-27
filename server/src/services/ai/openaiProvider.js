import { env } from "../../config/env.js";
import { buildReviewPrompt } from "../../utils/prompts.js";
import { normalizedResult, providerFetch } from "./common.js";

export async function generateReview(context) {
  const prompt = buildReviewPrompt(context);
  if (!env.OPENAI_API_KEY) {
    const payload = await providerFetch(
      `${env.OLLAMA_BASE_URL}/api/generate`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: env.OLLAMA_MODEL,
          prompt,
          stream: false,
          format: "json",
          options: { temperature: 0.2 },
        }),
      },
      env.AI_TIMEOUT_MS,
    );
    return normalizedResult(payload.response || "", {
      input: payload.prompt_eval_count,
      output: payload.eval_count,
    });
  }
  const payload = await providerFetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        response_format: { type: "json_object" },
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      }),
    },
    env.AI_TIMEOUT_MS,
  );
  return normalizedResult(payload.choices?.[0]?.message?.content || "", {
    input: payload.usage?.prompt_tokens,
    output: payload.usage?.completion_tokens,
  });
}
