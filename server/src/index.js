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
    "Mock mode enabled; use the local demo login without MongoDB, Redis, GitHub, or AI credentials",
  );
const server = http.createServer(createApp());
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    logger.fatal({ port: env.PORT }, `Port ${env.PORT} is already in use. Stop the older PRism process or choose another PORT.`);
    process.exit(1);
  }
  throw error;
});
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
