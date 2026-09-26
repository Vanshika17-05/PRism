import { Router } from "express";
import { listRepos, repoStats, updateSettings } from "../controllers/repo.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const repoRouter = Router();
repoRouter.get("/", asyncHandler(listRepos));
repoRouter.get("/:id/stats", asyncHandler(repoStats));
repoRouter.patch("/:id/settings", asyncHandler(updateSettings));
