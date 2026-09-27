import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.model.js";

const sessionCookie = "prism_session";
const stateCookie = "prism_oauth_state";
const cookieBase = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.NODE_ENV === "production",
  path: "/",
};

function parseCookies(req) {
  return Object.fromEntries(
    (req.get("cookie") || "")
      .split(";")
      .map((part) => part.trim().split(/=(.*)/s))
      .filter(([key]) => key)
      .map(([key, value]) => [key, decodeURIComponent(value || "")]),
  );
}

function publicUser(user) {
  return {
    _id: String(user._id),
    githubId: user.githubId,
    username: user.username,
    avatarUrl: user.avatarUrl,
    githubUrl: user.githubUrl,
    email: user.email || "",
    name: user.name,
  };
}

function issueToken(user) {
  return jwt.sign(publicUser(user), env.JWT_SECRET, { expiresIn: "7d" });
}
export const oauthConfigured = () =>
  Boolean(env.GITHUB_APP_CLIENT_ID && env.GITHUB_APP_CLIENT_SECRET);
export const readSessionCookie = (req) =>
  parseCookies(req)[sessionCookie] || "";

export function authConfig(_req, res) {
  res.json({ githubConfigured: oauthConfigured() });
}

export function beginGithubAuth(_req, res) {
  if (!oauthConfigured())
    return res
      .status(503)
      .json({ error: "GitHub sign-in isn't configured yet" });
  const state = crypto.randomBytes(24).toString("hex");
  res.cookie(stateCookie, state, { ...cookieBase, maxAge: 10 * 60_000 });
  const query = new URLSearchParams({
    client_id: env.GITHUB_APP_CLIENT_ID,
    redirect_uri: `${env.APP_URL}/api/auth/github/callback`,
    scope: "read:user user:email",
    state,
  });
  return res.redirect(`https://github.com/login/oauth/authorize?${query}`);
}

export async function githubCallback(req, res) {
  if (!oauthConfigured()) return res.redirect("/login?error=not-configured");
  const expectedState = parseCookies(req)[stateCookie];
  const receivedState = Buffer.from(String(req.query.state || ""));
  const storedState = Buffer.from(expectedState || "");
  if (
    !req.query.code ||
    !receivedState.length ||
    receivedState.length !== storedState.length ||
    !crypto.timingSafeEqual(receivedState, storedState)
  )
    return res.redirect("/login?error=invalid-state");
  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_APP_CLIENT_ID,
        client_secret: env.GITHUB_APP_CLIENT_SECRET,
        code: req.query.code,
        redirect_uri: `${env.APP_URL}/api/auth/github/callback`,
      }),
    },
  );
  const tokenPayload = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenPayload.access_token)
    return res.redirect("/login?error=oauth-failed");
  const headers = {
    authorization: `Bearer ${tokenPayload.access_token}`,
    accept: "application/vnd.github+json",
    "user-agent": "PRism",
  };
  const [profileResponse, emailsResponse] = await Promise.all([
    fetch("https://api.github.com/user", { headers }),
    fetch("https://api.github.com/user/emails", { headers }),
  ]);
  if (!profileResponse.ok) return res.redirect("/login?error=profile-failed");
  const profile = await profileResponse.json();
  const emails = emailsResponse.ok ? await emailsResponse.json() : [];
  const email =
    profile.email ||
    emails.find((item) => item.primary && item.verified)?.email ||
    "";
  const identity = {
    githubId: profile.id,
    username: profile.login,
    avatarUrl: profile.avatar_url,
    githubUrl: profile.html_url,
    email,
    name: profile.name || profile.login,
    githubAccessToken: tokenPayload.access_token,
  };
  // Mock infrastructure still performs genuine GitHub OAuth; only persistence is skipped when MongoDB is intentionally disabled.
  const user = env.USE_MOCKS
    ? { ...identity, _id: `github-${profile.id}` }
    : await User.findOneAndUpdate({ githubId: profile.id }, identity, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      });
  res.clearCookie(stateCookie, cookieBase);
  res.cookie(sessionCookie, issueToken(user), {
    ...cookieBase,
    maxAge: 7 * 24 * 60 * 60_000,
  });
  return res.redirect("/dashboard/overview");
}

export function logout(_req, res) {
  res.clearCookie(sessionCookie, cookieBase);
  return res.status(204).end();
}
export function me(req, res) {
  return res.json({ user: req.user });
}
