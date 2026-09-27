import { aiBucket } from "../rate-limit.service.js";
import { generateReview as openai } from "./openaiProvider.js";
import { generateReview as gemini } from "./geminiProvider.js";
import { generateReview as claude } from "./claudeProvider.js";

const providers = { openai, gemini, claude };
export async function generateReview(provider, context) {
  await aiBucket.acquire();
  const strategy = providers[provider];
  if (!strategy) throw new Error(`Unsupported AI provider: ${provider}`);
  return strategy(context);
}
