import { env } from "../../config/env.js";
import { buildReviewPrompt } from "../../utils/prompts.js";
import { normalizedResult, providerFetch } from "./common.js";

export async function generateReview(context) {
  if (!env.GEMINI_API_KEY || !env.GEMINI_MODEL)
    throw Object.assign(
      new Error("GEMINI_API_KEY and GEMINI_MODEL must both be configured"),
      {
        status: 503,
      },
    );
  const payload = await providerFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY,
      },
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
