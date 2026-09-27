import Redis from "ioredis";
import { env } from "../config/env.js";

let client;
export function getRedisClient() {
  if (env.USE_MOCKS) return null;
  client ||= new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
  });
  if (client.status === "wait") client.connect().catch(() => {});
  return client;
}
