import { Router } from "express";
import { databaseState } from "../config/db.js";

export const healthRouter = Router();
healthRouter.get("/", (_req, res) => res.json({ status: "ok", uptimeSeconds: Math.floor(process.uptime()), database: databaseState(), aiProvider: "ollama-local" }));
