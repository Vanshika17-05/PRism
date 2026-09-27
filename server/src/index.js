import http from "node:http";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { closeReviewQueue, startReviewWorker } from "./queues/review.queue.js";
import { initializeRealtime } from "./services/realtime.service.js";

await connectDatabase();
if (env.USE_MOCKS)
  logger.info(
    "Mock infrastructure mode enabled; GitHub OAuth still requires configured client credentials",
  );
const server = http.createServer(createApp());
initializeRealtime(server);
startReviewWorker();
server.listen(env.PORT, "0.0.0.0", () =>
  logger.info({ port: env.PORT }, "PRism API listening"),
);

async function shutdown(signal) {
  logger.info({ signal }, "Graceful shutdown started");
  server.close(async () => {
    await closeReviewQueue();
    await mongoose.disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (error) =>
  logger.error({ err: error }, "Unhandled rejection"),
);
