import express from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { healthRouter } from "./routes/health.routes.js";
import { webhookRouter } from "./routes/webhook.routes.js";
import { reviewRouter } from "./routes/review.routes.js";
import { repoRouter } from "./routes/repo.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { failedReviewRouter } from "./routes/failed-review.routes.js";
import { metricsRouter } from "./routes/metrics.routes.js";
import { storageRouter } from "./routes/storage.routes.js";
import { publicRouter } from "./routes/public.routes.js";
import { organizationRouter, inviteRouter } from "./routes/organization.routes.js";
import { requestContextMiddleware } from "./utils/requestContext.js";
import { authMiddleware } from "./middleware/auth.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authenticatedUserLimiter, globalApiLimiter, webhookCeilingLimiter } from "./middleware/rateLimits.js";

export function createApp() {
  const app = express();
  const clientDist = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../client/dist",
  );
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: [env.CLIENT_URL, env.APP_URL], credentials: true }));
  app.use(requestContextMiddleware);
  app.use(pinoHttp({ logger }));
  app.use(
    "/api/webhooks/github",
    webhookCeilingLimiter,
    express.raw({ type: "application/json", limit: "2mb" }),
    webhookRouter,
  );
  app.use(express.json({ limit: "200kb" }));
  app.use("/api", globalApiLimiter);
  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/public", publicRouter);
  app.use("/api/organizations", authMiddleware, authenticatedUserLimiter, organizationRouter);
  app.use("/api/invites", authMiddleware, authenticatedUserLimiter, inviteRouter);
  app.use("/api/reviews", authMiddleware, authenticatedUserLimiter, reviewRouter);
  app.use("/api/repos", authMiddleware, authenticatedUserLimiter, repoRouter);
  app.use("/api/failed-reviews", authMiddleware, authenticatedUserLimiter, failedReviewRouter);
  app.use("/api/storage", authMiddleware, authenticatedUserLimiter, storageRouter);
  // Operational metrics are authenticated because queue/error data can reveal internal workload patterns.
  app.use("/api/metrics", authMiddleware, authenticatedUserLimiter, metricsRouter);
  if (existsSync(clientDist)) {
    app.use(
      express.static(clientDist, {
        index: false,
        maxAge: env.NODE_ENV === "production" ? "1d" : 0,
      }),
    );
    app.use((req, res, next) =>
      req.method === "GET" &&
      !req.path.startsWith("/api/") &&
      req.accepts("html")
        ? res.sendFile(path.join(clientDist, "index.html"))
        : next(),
    );
  }
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
