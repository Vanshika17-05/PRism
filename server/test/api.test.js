import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";
import { enqueueReview } from "../src/queues/review.queue.js";
import { mockFailedReviews, mockRepositories } from "../src/data/mockData.js";
import {
  mockInvites,
  mockOrganizations,
} from "../src/data/mockOrganizations.js";
import { createSession } from "../src/services/session.service.js";
import {
  ensurePersonalOrganization,
  personalWorkspaceSlug,
} from "../src/services/organization.service.js";

async function withServer(run) {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
const testSession = await createSession("test-user", "PRism test suite");
const token = jwt.sign(
  {
    _id: "test-user",
    username: "test-engineer",
    name: "Test Engineer",
    email: "test@example.com",
    jti: testSession.jti,
  },
  env.JWT_SECRET,
  { expiresIn: "5m" },
);

test("fresh GitHub sign-in creates an idempotent personal owner workspace", async () => {
  let operation;
  const fakeOrganizationModel = {
    findOneAndUpdate(filter, update, options) {
      operation = { filter, update, options };
      return Promise.resolve(update.$setOnInsert);
    },
  };
  const workspace = await ensurePersonalOrganization(
    { _id: "new-user", username: "Fresh User", githubId: 4242 },
    fakeOrganizationModel,
  );
  assert.equal(
    personalWorkspaceSlug("Fresh User", 4242),
    "fresh-user-workspace-4242",
  );
  assert.deepEqual(operation.filter, { ownerId: "new-user" });
  assert.equal(operation.options.upsert, true);
  assert.equal(workspace.name, "Fresh User's workspace");
  assert.deepEqual(workspace.members, [{ userId: "new-user", role: "owner" }]);
});

test("health, auth, and protected dashboard API", () =>
  withServer(async (base) => {
    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.match(health.headers.get("x-request-id"), /^[0-9a-f-]{36}$/);
    assert.equal((await health.json()).status, "ok");
    assert.equal((await fetch(`${base}/api/repos`)).status, 401);
    const config = await (await fetch(`${base}/api/auth/config`)).json();
    assert.equal(typeof config.githubConfigured, "boolean");
    const repos = await fetch(`${base}/api/repos`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(repos.status, 200);
    const reposBody = await repos.json();
    assert.equal(reposBody.repositories.length, 3);
    const metrics = await fetch(`${base}/api/metrics`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(metrics.status, 200);
    const metricsBody = await metrics.json();
    assert.equal(metricsBody.queue.depth, 0);
    assert.equal(typeof metricsBody.errorRate, "number");
    const budget = await fetch(
      `${base}/api/repos/${reposBody.repositories[0]._id}/settings`,
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ monthlyTokenBudget: 600000 }),
      },
    );
    assert.equal(budget.status, 200);
    assert.equal(
      (await budget.json()).repository.settings.monthlyTokenBudget,
      600000,
    );
    const reviews = await (
      await fetch(`${base}/api/reviews`, {
        headers: { authorization: `Bearer ${token}` },
      })
    ).json();
    assert.deepEqual(
      new Set(reviews.items[0].findings.map((finding) => finding.source)),
      new Set(["ai", "lint"]),
    );
    const finding = reviews.items[0].findings[0];
    const dismissed = await fetch(
      `${base}/api/reviews/${reviews.items[0]._id}/findings/${finding._id}/dismiss`,
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          dismissed: true,
          reason: "Internal test fixture",
        }),
      },
    );
    assert.equal(dismissed.status, 200);
    assert.equal((await dismissed.json()).learningStored, true);
    const patterns = await (
      await fetch(
        `${base}/api/repos/${reviews.items[0].repository._id}/suppressions`,
        { headers: { authorization: `Bearer ${token}` } },
      )
    ).json();
    assert.ok(
      patterns.patterns.some(
        (pattern) => pattern.reason === "Internal test fixture",
      ),
    );
    const lintFinding = reviews.items[0].findings.find(
      (item) => item.source === "lint",
    );
    const lintDismiss = await fetch(
      `${base}/api/reviews/${reviews.items[0]._id}/findings/${lintFinding._id}/dismiss`,
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ dismissed: true, reason: "Ignore it" }),
      },
    );
    assert.equal(lintDismiss.status, 400);
  }));

test("webhook rejects bad signatures and accepts valid supported events", () =>
  withServer(async (base) => {
    const body = JSON.stringify({
      action: "opened",
      pull_request: { draft: false },
    });
    const bad = await fetch(`${base}/api/webhooks/github`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-github-event": "pull_request",
        "x-github-delivery": "test-bad",
        "x-hub-signature-256": "sha256=bad",
      },
      body,
    });
    assert.equal(bad.status, 401);
    const signature = `sha256=${crypto
      .createHmac("sha256", env.GITHUB_WEBHOOK_SECRET || "")
      .update(body)
      .digest("hex")}`;
    const good = await fetch(`${base}/api/webhooks/github`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-github-event": "pull_request",
        "x-github-delivery": "test-good",
        "x-hub-signature-256": signature,
      },
      body,
    });
    assert.equal(good.status, 202);
  }));

test("paused repositories acknowledge pull requests without queuing reviews", () =>
  withServer(async (base) => {
    const paused = mockRepositories.find((repository) => !repository.isActive);
    const body = JSON.stringify({
      action: "opened",
      repository: { id: paused.githubRepoId },
      pull_request: { draft: false },
    });
    const signature = `sha256=${crypto
      .createHmac("sha256", env.GITHUB_WEBHOOK_SECRET || "")
      .update(body)
      .digest("hex")}`;
    const response = await fetch(`${base}/api/webhooks/github`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-github-event": "pull_request",
        "x-github-delivery": "test-paused",
        "x-hub-signature-256": signature,
      },
      body,
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      skipped: true,
      reason: "reviews_paused",
    });
  }));

test("member role can read repositories but cannot change settings", () =>
  withServer(async (base) => {
    const member = mockOrganizations[0].members[0];
    const originalRole = member.role;
    member.role = "member";
    try {
      const headers = {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-organization-id": mockOrganizations[0]._id,
      };
      assert.equal((await fetch(`${base}/api/repos`, { headers })).status, 200);
      const response = await fetch(
        `${base}/api/repos/${mockRepositories[0]._id}/settings`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ persona: "strict" }),
        },
      );
      assert.equal(response.status, 403);
      assert.equal((await response.json()).code, "INSUFFICIENT_ROLE");
    } finally {
      member.role = originalRole;
    }
  }));

test("an invited signed-in user joins the organization and the invite is consumed", () =>
  withServer(async (base) => {
    const inviteResponse = await fetch(
      `${base}/api/organizations/${mockOrganizations[0]._id}/invite`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ email: "invitee@example.com", role: "member" }),
      },
    );
    assert.equal(inviteResponse.status, 201);
    const pending = mockInvites.find(
      (invite) => invite.email === "invitee@example.com",
    );
    assert.ok(pending);

    const inviteeSession = await createSession("invitee-user", "Invite test");
    const inviteeToken = jwt.sign(
      {
        _id: "invitee-user",
        username: "invitee",
        email: "invitee@example.com",
        jti: inviteeSession.jti,
      },
      env.JWT_SECRET,
      { expiresIn: "5m" },
    );
    const accepted = await fetch(
      `${base}/api/invites/${pending.token}/accept`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${inviteeToken}` },
      },
    );
    assert.equal(accepted.status, 200);
    assert.ok(
      mockOrganizations[0].members.some(
        (member) =>
          member.userId === "invitee-user" && member.role === "member",
      ),
    );
    assert.equal(mockInvites.includes(pending), false);
    mockOrganizations[0].members = mockOrganizations[0].members.filter(
      (member) => member.userId !== "invitee-user",
    );
  }));

test("audit log is organization-scoped, filterable, and visible to members", () =>
  withServer(async (base) => {
    const member = mockOrganizations[0].members[0];
    const originalRole = member.role;
    const ownerHeaders = {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    };
    const created = await fetch(
      `${base}/api/organizations/${mockOrganizations[0]._id}/invite`,
      {
        method: "POST",
        headers: ownerHeaders,
        body: JSON.stringify({ email: "audit@example.com", role: "member" }),
      },
    );
    assert.equal(created.status, 201);
    member.role = "member";
    try {
      const headers = {
        authorization: `Bearer ${token}`,
        "x-organization-id": mockOrganizations[0]._id,
      };
      const response = await fetch(
        `${base}/api/organizations/${mockOrganizations[0]._id}/audit-log?action=member.invited`,
        { headers },
      );
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.ok(body.items.length >= 1);
      assert.ok(body.items.every((entry) => entry.action === "member.invited"));
      assert.equal(body.pagination.page, 1);

      const foreign = await fetch(
        `${base}/api/organizations/65f000000000000000009999/audit-log`,
        { headers },
      );
      assert.equal(foreign.status, 403);
    } finally {
      member.role = originalRole;
      const index = mockInvites.findIndex(
        (invite) => invite.email === "audit@example.com",
      );
      if (index >= 0) mockInvites.splice(index, 1);
    }
  }));

test("global API limiter returns JSON 429 with Retry-After", () =>
  withServer(async (base) => {
    let response;
    for (let index = 0; index < 101; index += 1)
      response = await fetch(`${base}/api/health`, {
        headers: { "x-forwarded-for": "203.0.113.40" },
      });
    assert.equal(response.status, 429);
    assert.ok(Number(response.headers.get("retry-after")) > 0);
    const body = await response.json();
    assert.equal(body.error, "rate_limit_exceeded");
    assert.ok(body.retryAfter > 0);
  }));

test("sessions can be listed and revoked immediately", () =>
  withServer(async (base) => {
    const headers = { authorization: `Bearer ${token}` };
    const listed = await fetch(`${base}/api/auth/sessions`, { headers });
    assert.equal(listed.status, 200);
    const body = await listed.json();
    assert.ok(body.sessions.some((session) => session.current));

    const extra = await createSession("test-user", "Other browser");
    const revoked = await fetch(`${base}/api/auth/sessions/${extra.jti}`, {
      method: "DELETE",
      headers,
    });
    assert.equal(revoked.status, 204);
    const extraToken = jwt.sign(
      { _id: "test-user", jti: extra.jti },
      env.JWT_SECRET,
      { expiresIn: "5m" },
    );
    const denied = await fetch(`${base}/api/auth/me`, {
      headers: { authorization: `Bearer ${extraToken}` },
    });
    assert.equal(denied.status, 401);
  }));

test("failed review reaches dead letter after three attempts and can be retried", () =>
  withServer(async (base) => {
    mockFailedReviews.length = 0;
    await enqueueReview(
      {
        repoId: "66f000000000000000000000001",
        prNumber: 999,
        headSha: "forced-failure",
        deliveryId: "dead-letter-test",
        forceFailure: true,
        failureMessage: "Python service unavailable",
      },
      { processNow: true },
    );
    assert.equal(mockFailedReviews.length, 1);
    assert.equal(mockFailedReviews[0].attemptsMade, 3);
    const headers = { authorization: `Bearer ${token}` };
    const listed = await (
      await fetch(`${base}/api/failed-reviews`, { headers })
    ).json();
    assert.equal(listed.pagination.total, 1);
    assert.match(listed.items[0].error, /Python service unavailable/);
    const retried = await fetch(
      `${base}/api/failed-reviews/${listed.items[0]._id}/retry`,
      { method: "POST", headers },
    );
    assert.equal(retried.status, 202);
    assert.equal(mockFailedReviews.length, 0);
  }));
