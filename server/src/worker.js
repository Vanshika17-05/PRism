import mongoose from "mongoose";
import { connectDatabase } from "./config/db.js";
import { closeReviewQueue, startReviewWorker } from "./queues/review.queue.js";
import { logger } from "./utils/logger.js";

await connectDatabase();
const worker = startReviewWorker();

if (!worker)
  logger.warn("Review worker is idle because mock infrastructure is enabled");

async function shutdown(signal) {
  logger.info({ signal }, "Review worker shutdown started");
  await closeReviewQueue();
  await mongoose.disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (error) => {
  logger.error({ err: error }, "Unhandled worker rejection");
  process.exitCode = 1;
});
