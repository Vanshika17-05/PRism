import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

async function request(path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${env.PYTHON_SERVICE_URL}${path}`, { method: "POST", signal: controller.signal, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Python service returned ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

export async function analyzeComplexity(files) {
  try { return (await request("/complexity", { files })).files || []; }
  catch (error) { logger.warn({ err: error }, "Complexity enrichment unavailable"); return []; }
}

export async function enrichFindingMemory(repoId, reviewId, findings) {
  return Promise.all(findings.map(async (finding) => {
    try {
      const result = await request("/embed-and-search", { repoId: String(repoId), reviewId: String(reviewId), findingText: `${finding.title}. ${finding.body}` });
      return result.match ? { ...finding, similarToReviewId: result.match.reviewId, similarity: result.match.similarity } : finding;
    } catch (error) { logger.warn({ err: error }, "Review-memory enrichment unavailable"); return finding; }
  }));
}
