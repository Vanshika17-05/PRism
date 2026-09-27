import crypto from "node:crypto";
import { getRedisClient } from "./redis.client.js";

const ttlSeconds = 7 * 24 * 60 * 60;
const mockSessions = new Map();
const userKey = (userId) => `prism:sessions:${userId}`;
const sessionKey = (jti) => `prism:session:${jti}`;

export async function createSession(userId, userAgent = "Unknown device") {
  const jti = crypto.randomUUID();
  const session = {
    jti,
    userId: String(userId),
    issuedAt: new Date().toISOString(),
    userAgent: userAgent || "Unknown device",
  };
  const redis = getRedisClient();
  if (!redis) {
    mockSessions.set(jti, session);
    return session;
  }
  await redis
    .multi()
    .sadd(userKey(userId), jti)
    .expire(userKey(userId), ttlSeconds)
    .set(sessionKey(jti), JSON.stringify(session), "EX", ttlSeconds)
    .exec();
  return session;
}

export async function isSessionActive(userId, jti) {
  if (!jti) return false;
  const redis = getRedisClient();
  if (!redis) return mockSessions.get(jti)?.userId === String(userId);
  return (await redis.sismember(userKey(userId), jti)) === 1;
}

export async function listSessions(userId) {
  const redis = getRedisClient();
  if (!redis)
    return [...mockSessions.values()].filter(
      (session) => session.userId === String(userId),
    );
  const ids = await redis.smembers(userKey(userId));
  if (!ids.length) return [];
  const values = await redis.mget(ids.map(sessionKey));
  const stale = ids.filter((_, index) => !values[index]);
  if (stale.length) await redis.srem(userKey(userId), ...stale);
  return values.filter(Boolean).map((value) => JSON.parse(value));
}

export async function revokeSession(userId, jti) {
  const redis = getRedisClient();
  if (!redis) {
    if (mockSessions.get(jti)?.userId === String(userId))
      mockSessions.delete(jti);
    return;
  }
  await redis.multi().srem(userKey(userId), jti).del(sessionKey(jti)).exec();
}

export async function revokeOtherSessions(userId, currentJti) {
  const sessions = await listSessions(userId);
  await Promise.all(
    sessions
      .filter(({ jti }) => jti !== currentJti)
      .map(({ jti }) => revokeSession(userId, jti)),
  );
}
