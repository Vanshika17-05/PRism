import pino from "pino";
import { env } from "../config/env.js";
import { currentRequestId } from "./requestContext.js";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  redact: ["req.headers.authorization", "req.headers.x-hub-signature-256", "privateKey", "webhookSecret"],
  mixin() { const requestId = currentRequestId(); return requestId ? { requestId } : {}; },
  transport: env.NODE_ENV === "development" ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } } : undefined
});
