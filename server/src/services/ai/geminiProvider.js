import { env } from "../../config/env.js";
import { buildReviewPrompt } from "../../utils/prompts.js";
import { normalizedResult, providerFetch } from "./common.js";

export async function generateReview(context) {
  if (!env.GEMINI_API_KEY)
    throw Object.assign(new Error("GEMINI_API_KEY is not configured"), {
      status: 503,
    });
  const payload = await providerFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildReviewPrompt(context) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
    },
    env.AI_TIMEOUT_MS,
  );
  return normalizedResult(
    payload.candidates?.[0]?.content?.parts?.[0]?.text || "",
    {
      input: payload.usageMetadata?.promptTokenCount,
      output: payload.usageMetadata?.candidatesTokenCount,
    },
  );
}
