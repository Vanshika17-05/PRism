import { applyPatch } from "diff";
import { env } from "../config/env.js";
import { providerFetch } from "./ai/common.js";

function cleanPatch(text) {
  return text
    .trim()
    .replace(/^```(?:diff)?\s*/i, "")
    .replace(/\s*```$/, "");
}
async function proposeWithProvider(provider, prompt) {
  if (provider === "gemini") {
    if (!env.GEMINI_API_KEY)
      throw new Error("GEMINI_API_KEY is not configured");
    const body = await providerFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
      env.AI_TIMEOUT_MS,
    );
    return body.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
  if (provider === "claude") {
    if (!env.ANTHROPIC_API_KEY)
      throw new Error("ANTHROPIC_API_KEY is not configured");
    const body = await providerFetch(
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
          messages: [{ role: "user", content: prompt }],
        }),
      },
      env.AI_TIMEOUT_MS,
    );
    return body.content?.find((part) => part.type === "text")?.text || "";
  }
  if (env.OPENAI_API_KEY) {
    const body = await providerFetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL,
          messages: [{ role: "user", content: prompt }],
        }),
      },
      env.AI_TIMEOUT_MS,
    );
    return body.choices?.[0]?.message?.content || "";
  }
  const body = await providerFetch(
    `${env.OLLAMA_BASE_URL}/api/generate`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: env.OLLAMA_MODEL, prompt, stream: false }),
    },
    env.AI_TIMEOUT_MS,
  );
  return body.response || "";
}

export async function runFixAgent({ provider, finding, fileContent }) {
  const prompt = `You are a code-fixing agent. Return only a unified diff that applies to the exact file below. Do not explain it.\nFile: ${finding.file}\nIssue: ${finding.title}\n${finding.body}\n\nCURRENT FILE:\n${fileContent}`;
  const patch = cleanPatch(await proposeWithProvider(provider, prompt));
  const result = applyPatch(fileContent, patch);
  if (result === false)
    throw Object.assign(
      new Error("The proposed patch did not apply cleanly to the current file"),
      { status: 422 },
    );
  return { patch, resultingContent: result, validated: true };
}
