import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { healthRouter } from "./routes/health.routes.js";
import { webhookRouter } from "./routes/webhook.routes.js";
import { reviewRouter } from "./routes/review.routes.js";
import { repoRouter } from "./routes/repo.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { authMiddleware } from "./middleware/auth.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by"); app.set("trust proxy", 1);
  app.use(helmet()); app.use(cors({ origin: env.CLIENT_URL })); app.use(pinoHttp({ logger }));
  app.use("/api/webhooks/github", express.raw({ type: "application/json", limit: "2mb" }), webhookRouter);
  app.use(express.json({ limit: "200kb" }));
  app.use("/api", rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false }));
  app.use("/api/health", healthRouter); app.use("/api/auth", authRouter);
  app.use("/api/reviews", authMiddleware, reviewRouter); app.use("/api/repos", authMiddleware, repoRouter);
  app.use(notFound); app.use(errorHandler);
  return app;
}
