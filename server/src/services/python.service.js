import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

async function request(path, { method = "GET", body } = {}) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${env.PYTHON_SERVICE_URL}${path}`, { method, signal: controller.signal, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    if (!response.ok) throw new Error(`Python service returned ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

export async function analyzeComplexity(files) {
  try { return (await request("/complexity", { method: "POST", body: { files } })).files || []; }
  catch (error) { logger.warn({ err: error }, "Complexity enrichment unavailable"); return []; }
}

export async function lintPythonFiles(files) {
  const pythonFiles = files.filter((file) => file.language === "python");
  if (!pythonFiles.length) return [];
  try { return (await request("/lint", { method: "POST", body: { files: pythonFiles } })).files || []; }
  catch (error) { logger.warn({ err: error }, "Python lint unavailable"); return []; }
}

export async function enrichFindingMemory(repoId, reviewId, findings) {
  const results = await Promise.all(findings.map(async (finding) => {
    try {
      const result = await request("/embed-and-search", { method: "POST", body: { repoId: String(repoId), reviewId: String(reviewId), findingText: `${finding.title}. ${finding.body}`, file: finding.file, type: "past_finding" } });
      if (result.suppressed) return { suppressed: true, finding: null };
      return { suppressed: false, finding: result.match ? { ...finding, similarToReviewId: result.match.reviewId, similarity: result.match.similarity } : finding };
    } catch (error) { logger.warn({ err: error }, "Review-memory enrichment unavailable"); return { suppressed: false, finding }; }
  }));
  return { findings: results.filter((item) => !item.suppressed).map((item) => item.finding), suppressedCount: results.filter((item) => item.suppressed).length };
}

export async function storeKnownNonIssue({ repoId, reviewId, finding, reason }) {
  return request("/embed-and-search", { method: "POST", body: { repoId: String(repoId), reviewId: String(reviewId), findingText: `${finding.title}. ${finding.body}`, file: finding.file, reason: reason || "", type: "known_non_issue" } });
}

export const listSuppressionPatterns = (repoId) => request(`/suppressions/${encodeURIComponent(repoId)}`);
export const deleteSuppressionPattern = (repoId, patternId) => request(`/suppressions/${encodeURIComponent(repoId)}/${encodeURIComponent(patternId)}`, { method: "DELETE" });
