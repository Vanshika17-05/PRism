import { Router } from "express";
import { getMetrics } from "../controllers/metrics.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const metricsRouter = Router();
metricsRouter.get("/", asyncHandler(getMetrics));
