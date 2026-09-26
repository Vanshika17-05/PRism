import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";

async function withServer(run) { const server = createApp().listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve)); try { await run(`http://127.0.0.1:${server.address().port}`); } finally { await new Promise((resolve) => server.close(resolve)); } }

test("health, auth, and protected dashboard API", () => withServer(async (base) => {
  const health = await fetch(`${base}/api/health`); assert.equal(health.status, 200); assert.equal((await health.json()).status, "ok");
  assert.equal((await fetch(`${base}/api/repos`)).status, 401);
  const login = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "demo@prism.dev", password: "prism-demo-2026" }) });
  assert.equal(login.status, 200); const { token } = await login.json();
  const repos = await fetch(`${base}/api/repos`, { headers: { authorization: `Bearer ${token}` } }); assert.equal(repos.status, 200); assert.equal((await repos.json()).repositories.length, 3);
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
