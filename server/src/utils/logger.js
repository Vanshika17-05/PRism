import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  redact: ["req.headers.authorization", "req.headers.x-hub-signature-256", "privateKey", "webhookSecret"],
  transport: env.NODE_ENV === "development" ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } } : undefined
});
