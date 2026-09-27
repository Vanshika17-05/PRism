import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";
import { enqueueReview } from "../src/queues/review.queue.js";
import { mockFailedReviews, mockRepositories } from "../src/data/mockData.js";

async function withServer(run) { const server = createApp().listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve)); try { await run(`http://127.0.0.1:${server.address().port}`); } finally { await new Promise((resolve) => server.close(resolve)); } }
const token = jwt.sign({ _id: "test-user", username: "test-engineer", name: "Test Engineer" }, env.JWT_SECRET, { expiresIn: "5m" });

test("health, auth, and protected dashboard API", () => withServer(async (base) => {
  const health = await fetch(`${base}/api/health`); assert.equal(health.status, 200); assert.match(health.headers.get("x-request-id"), /^[0-9a-f-]{36}$/); assert.equal((await health.json()).status, "ok");
  assert.equal((await fetch(`${base}/api/repos`)).status, 401);
  const config = await (await fetch(`${base}/api/auth/config`)).json(); assert.equal(typeof config.githubConfigured, "boolean");
  const repos = await fetch(`${base}/api/repos`, { headers: { authorization: `Bearer ${token}` } }); assert.equal(repos.status, 200); const reposBody = await repos.json(); assert.equal(reposBody.repositories.length, 3);
  const metrics = await fetch(`${base}/api/metrics`, { headers: { authorization: `Bearer ${token}` } }); assert.equal(metrics.status, 200); const metricsBody = await metrics.json(); assert.equal(metricsBody.queue.depth, 0); assert.equal(typeof metricsBody.errorRate, "number");
  const budget = await fetch(`${base}/api/repos/${reposBody.repositories[0]._id}/settings`, { method: "PATCH", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ monthlyTokenBudget: 600000 }) }); assert.equal(budget.status, 200); assert.equal((await budget.json()).repository.settings.monthlyTokenBudget, 600000);
  const reviews = await (await fetch(`${base}/api/reviews`, { headers: { authorization: `Bearer ${token}` } })).json();
  assert.deepEqual(new Set(reviews.items[0].findings.map((finding) => finding.source)), new Set(["ai", "lint"]));
  const finding = reviews.items[0].findings[0];
  const dismissed = await fetch(`${base}/api/reviews/${reviews.items[0]._id}/findings/${finding._id}/dismiss`, { method: "PATCH", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ dismissed: true, reason: "Internal test fixture" }) });
  assert.equal(dismissed.status, 200); assert.equal((await dismissed.json()).learningStored, true);
  const patterns = await (await fetch(`${base}/api/repos/${reviews.items[0].repository._id}/suppressions`, { headers: { authorization: `Bearer ${token}` } })).json();
  assert.ok(patterns.patterns.some((pattern) => pattern.reason === "Internal test fixture"));
  const lintFinding = reviews.items[0].findings.find((item) => item.source === "lint");
  const lintDismiss = await fetch(`${base}/api/reviews/${reviews.items[0]._id}/findings/${lintFinding._id}/dismiss`, { method: "PATCH", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ dismissed: true, reason: "Ignore it" }) });
  assert.equal(lintDismiss.status, 400);
}));

test("webhook rejects bad signatures and accepts valid supported events", () => withServer(async (base) => {
  const body = JSON.stringify({ action: "opened", pull_request: { draft: false } });
  const bad = await fetch(`${base}/api/webhooks/github`, { method: "POST", headers: { "content-type": "application/json", "x-github-event": "pull_request", "x-github-delivery": "test-bad", "x-hub-signature-256": "sha256=bad" }, body }); assert.equal(bad.status, 401);
  const signature = `sha256=${crypto.createHmac("sha256", env.GITHUB_WEBHOOK_SECRET || "").update(body).digest("hex")}`;
  const good = await fetch(`${base}/api/webhooks/github`, { method: "POST", headers: { "content-type": "application/json", "x-github-event": "pull_request", "x-github-delivery": "test-good", "x-hub-signature-256": signature }, body }); assert.equal(good.status, 202);
}));

test("paused repositories acknowledge pull requests without queuing reviews", () => withServer(async (base) => {
  const paused = mockRepositories.find((repository) => !repository.isActive);
  const body = JSON.stringify({ action: "opened", repository: { id: paused.githubRepoId }, pull_request: { draft: false } });
  const signature = `sha256=${crypto.createHmac("sha256", env.GITHUB_WEBHOOK_SECRET || "").update(body).digest("hex")}`;
  const response = await fetch(`${base}/api/webhooks/github`, { method: "POST", headers: { "content-type": "application/json", "x-github-event": "pull_request", "x-github-delivery": "test-paused", "x-hub-signature-256": signature }, body });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { skipped: true, reason: "reviews_paused" });
}));

test("failed review reaches dead letter after three attempts and can be retried", () => withServer(async (base) => {
  mockFailedReviews.length = 0;
  await enqueueReview({ repoId: "66f000000000000000000000001", prNumber: 999, headSha: "forced-failure", deliveryId: "dead-letter-test", forceFailure: true, failureMessage: "Python service unavailable" }, { processNow: true });
  assert.equal(mockFailedReviews.length, 1); assert.equal(mockFailedReviews[0].attemptsMade, 3);
  const headers = { authorization: `Bearer ${token}` };
  const listed = await (await fetch(`${base}/api/failed-reviews`, { headers })).json(); assert.equal(listed.pagination.total, 1); assert.match(listed.items[0].error, /Python service unavailable/);
  const retried = await fetch(`${base}/api/failed-reviews/${listed.items[0]._id}/retry`, { method: "POST", headers }); assert.equal(retried.status, 202);
  assert.equal(mockFailedReviews.length, 0);
}));
