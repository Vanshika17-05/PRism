import { Review } from "../models/Review.model.js";
import { buildReviewableFiles, validateFindings } from "./diff.service.js";
import { getInstallationOctokit, listPullRequestFiles, loadFileContents, postReview } from "./github.service.js";
import { reviewWithAi } from "./ai.service.js";
import { analyzeComplexity, enrichFindingMemory } from "./python.service.js";
import { lintFiles, lintResultsToFindings } from "./lint.service.js";

const severityRank = { low: 1, medium: 2, high: 3 };

function batches(files, maxCharacters = 45_000) {
  const output = [];
  let current = [];
  let size = 0;
  for (const file of files) {
    if (current.length && size + file.patch.length > maxCharacters) { output.push(current); current = []; size = 0; }
    current.push(file); size += file.patch.length;
  }
  if (current.length) output.push(current);
  return output;
}

function summaryBody(summary, findings) {
  const counts = { high: 0, medium: 0, low: 0 };
  findings.forEach((finding) => { counts[finding.severity] += 1; });
  return `## PRism review\n\n${summary}\n\n| Severity | Findings |\n|---|---:|\n| High | ${counts.high} |\n| Medium | ${counts.medium} |\n| Low | ${counts.low} |\n\n<sub>Reviewed by PRism · AI suggestions should be verified by a human.</sub>`;
}

export async function processPullRequestReview({ repository, pullRequest, deliveryId }) {
  const startedAt = Date.now();
  let review;
  try {
    review = await Review.create({
      repository: repository.id, prNumber: pullRequest.number, prTitle: pullRequest.title, prUrl: pullRequest.html_url,
      prAuthor: pullRequest.user?.login || "unknown", headSha: pullRequest.head.sha, deliveryId, status: "processing"
    });
  } catch (error) {
    if (error.code === 11000) return null;
    throw error;
  }

  try {
    const octokit = await getInstallationOctokit(repository.installationId);
    const remoteFiles = await listPullRequestFiles(octokit, repository.owner, repository.name, pullRequest.number);
    const { reviewable, skipped } = buildReviewableFiles(remoteFiles, repository.settings);
    if (!reviewable.length) {
      review.status = "skipped"; review.summary = "No reviewable source changes were found.";
      review.stats = { filesReviewed: 0, filesSkipped: skipped.length, findingsCount: 0, durationMs: Date.now() - startedAt };
      await review.save(); return review;
    }

    const sourceFilesPromise = loadFileContents(octokit, repository.owner, repository.name, pullRequest.head.sha, reviewable);
    // Static analysis starts before the local LLM call and runs concurrently so it does not add serial review latency.
    const complexityPromise = sourceFilesPromise.then(analyzeComplexity);
    const lintPromise = sourceFilesPromise.then(lintFiles);
    const results = [];
    for (const group of batches(reviewable)) results.push(await reviewWithAi({ title: pullRequest.title, description: pullRequest.body, files: group, persona: repository.settings.persona, customRules: repository.settings.customRules }));
    const valid = validateFindings(results.flatMap((result) => result.findings.map((finding) => ({ ...finding, source: "ai" }))), reviewable);
    const threshold = severityRank[repository.settings.severityThreshold || "low"];
    const filtered = valid.filter((finding) => severityRank[finding.severity] >= threshold);
    // Candidate findings are checked against learned non-issues before either GitHub or a human reviewer sees them.
    const memory = await enrichFindingMemory(repository.id, review.id, filtered);
    const lintResults = await lintPromise;
    const lintFindings = validateFindings(lintResultsToFindings(lintResults), reviewable);
    const findings = [...memory.findings, ...lintFindings];
    const fileComplexity = await complexityPromise;
    const summary = results.map((result) => result.summary).filter(Boolean).join("\n\n");
    const overallRating = findings.some((item) => item.severity === "high") ? "request_changes" : findings.length ? "comment" : "approve";
    const posted = await postReview(octokit, {
      owner: repository.owner, repo: repository.name, prNumber: pullRequest.number, headSha: pullRequest.head.sha,
      body: summaryBody(summary, findings), event: overallRating === "request_changes" ? "REQUEST_CHANGES" : overallRating === "approve" ? "APPROVE" : "COMMENT", findings
    });
    review.status = "completed"; review.summary = summary; review.overallRating = overallRating;
    review.findings = findings.map((finding) => ({ ...finding, posted: true })); review.githubReviewId = posted.data.id;
    review.fileComplexity = fileComplexity;
    review.stats = {
      filesReviewed: reviewable.length, filesSkipped: skipped.length, findingsCount: findings.length, suppressedCount: memory.suppressedCount,
      tokensIn: results.reduce((sum, item) => sum + item.usage.input, 0), tokensOut: results.reduce((sum, item) => sum + item.usage.output, 0), durationMs: Date.now() - startedAt
    };
    await review.save(); return review;
  } catch (error) {
    review.status = "failed"; review.error = String(error.message || "Review failed").slice(0, 2000); review.stats.durationMs = Date.now() - startedAt;
    await review.save(); throw error;
  }
}
