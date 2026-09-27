import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getRedisClient } from "../services/redis.client.js";

function retryAfterSeconds(req, windowMs) {
  const reset = req.rateLimit?.resetTime?.getTime?.();
  return Math.max(1, Math.ceil(((reset || Date.now() + windowMs) - Date.now()) / 1000));
}

function limiter({ windowMs, limit, prefix, keyGenerator }) {
  const redis = getRedisClient();
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator,
    store: redis
      ? new RedisStore({ prefix: `prism:limit:${prefix}:`, sendCommand: (...args) => redis.call(...args) })
      : undefined,
    handler(req, res) {
      const retryAfter = retryAfterSeconds(req, windowMs);
      res.set("Retry-After", String(retryAfter));
      res.status(429).json({ error: "rate_limit_exceeded", retryAfter });
    },
  });
}

export const globalApiLimiter = limiter({ windowMs: 15 * 60_000, limit: 100, prefix: "global" });
export const authenticatedUserLimiter = limiter({ windowMs: 15 * 60_000, limit: 300, prefix: "user", keyGenerator: (req) => String(req.user?._id || req.user?.id) });
export const oauthCallbackLimiter = limiter({ windowMs: 15 * 60_000, limit: 5, prefix: "oauth" });
export const expensiveUserLimiter = limiter({ windowMs: 60 * 60_000, limit: 10, prefix: "expensive", keyGenerator: (req) => String(req.user?._id || req.user?.id) });
export const webhookCeilingLimiter = limiter({ windowMs: 60_000, limit: 200, prefix: "webhook" });
