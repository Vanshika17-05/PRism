import assert from "node:assert/strict";
import test from "node:test";
import {
  queryReviewAnalytics,
  recordReviewAnalytics,
} from "../src/services/analytics.service.js";

test("SQLite analytics stores rows and performs grouped SQL reporting", () => {
  const suffix = Date.now();
  const repo = `repo-${suffix}`;
  recordReviewAnalytics({
    id: `analytics-${suffix}`,
    repository: repo,
    createdAt: new Date(),
    findings: [{ severity: "high" }, { severity: "low" }],
    stats: { findingsCount: 2, durationMs: 120 },
  });
  const rows = queryReviewAnalytics(
    repo,
    "2000-01-01T00:00:00.000Z",
    "2100-01-01T00:00:00.000Z",
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].findingsCount, 2);
  assert.equal(rows[0].high, 1);
  assert.equal(rows[0].avgDuration, 120);
});
