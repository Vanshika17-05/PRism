import { Router } from "express";
import { databaseState } from "../config/db.js";
import { env } from "../config/env.js";

export const healthRouter = Router();
healthRouter.get("/", (_req, res) => res.json({
  status: "ok",
  uptimeSeconds: Math.floor(process.uptime()),
  database: databaseState(),
  mode: env.USE_MOCKS ? "mock" : "live",
  aiProvider: env.USE_MOCKS ? "mock" : "ollama-local"
}));
