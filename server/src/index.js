import http from "node:http";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import bcrypt from "bcryptjs";
import { User } from "./models/User.model.js";
import { closeReviewQueue, startReviewWorker } from "./queues/review.queue.js";

await connectDatabase();
if (!env.USE_MOCKS && !(await User.exists({}))) {
  const email = "demo@prism.dev"; const password = "prism-demo-2026";
  await User.create({ email, name: "Demo Engineer", passwordHash: await bcrypt.hash(password, 12) });
  logger.info({ email, password }, "Created demo user");
} else if (env.USE_MOCKS) logger.info({ email: "demo@prism.dev", password: "prism-demo-2026" }, "Mock demo user ready");
const server = http.createServer(createApp());
startReviewWorker();
server.listen(env.PORT, "0.0.0.0", () => logger.info({ port: env.PORT }, "PRism API listening"));

async function shutdown(signal) {
  logger.info({ signal }, "Graceful shutdown started");
  server.close(async () => { await closeReviewQueue(); await mongoose.disconnect(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (error) => logger.error({ err: error }, "Unhandled rejection"));
