import assert from "node:assert/strict";
import test from "node:test";
import { enrichFindingMemory, storeKnownNonIssue } from "../src/services/python.service.js";

test("dismissed feedback suppresses a strongly similar finding on the next PR", async () => {
  const originalFetch = global.fetch; let learnedText = "";
  global.fetch = async (_url, options) => {
    const body = JSON.parse(options.body || "{}");
    if (body.type === "known_non_issue") { learnedText = body.findingText; return Response.json({ stored: true, id: "pattern-1", suppressed: false }); }
    const suppressed = learnedText && body.findingText === learnedText;
    return Response.json({ match: null, suppressed, suppression: suppressed ? { id: "pattern-1", similarity: 1 } : null });
  };
  try {
    const finding = { file: "src/auth.js", line: 42, title: "Missing audience check", body: "Test fixtures use an internal token without an audience." };
    await storeKnownNonIssue({ repoId: "repo-1", reviewId: "review-1", finding, reason: "Internal test fixture" });
    const nextPr = await enrichFindingMemory("repo-1", "review-2", [{ ...finding, line: 57 }]);
    assert.equal(nextPr.suppressedCount, 1);
    assert.deepEqual(nextPr.findings, []);
  } finally { global.fetch = originalFetch; }
});
