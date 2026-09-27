import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

class TokenBucket {
  constructor(name, capacity) {
    this.name = name;
    this.capacity = capacity;
    this.tokens = capacity;
    this.lastRefill = Date.now();
    this.refillPerMs = capacity / 60_000;
  }
  async acquire() {
    for (;;) {
      const now = Date.now();
      this.tokens = Math.min(
        this.capacity,
        this.tokens + (now - this.lastRefill) * this.refillPerMs,
      );
      this.lastRefill = now;
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      const waitMs = Math.max(
        50,
        Math.ceil((1 - this.tokens) / this.refillPerMs),
      );
      logger.warn(
        { bucket: this.name, waitMs },
        "External API token bucket exhausted; delaying review job",
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

export const githubBucket = new TokenBucket(
  "github",
  env.GITHUB_RATE_LIMIT_PER_MINUTE,
);
export const aiBucket = new TokenBucket("ai", env.AI_RATE_LIMIT_PER_MINUTE);
