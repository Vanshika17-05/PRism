import { Router } from "express";
import { deleteSuppression, listRepos, listSuppressions, repoStats, updateSettings } from "../controllers/repo.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const repoRouter = Router();
repoRouter.get("/", asyncHandler(listRepos));
repoRouter.get("/:id/stats", asyncHandler(repoStats));
repoRouter.patch("/:id/settings", asyncHandler(updateSettings));
repoRouter.get("/:id/suppressions", asyncHandler(listSuppressions));
repoRouter.delete("/:id/suppressions/:patternId", asyncHandler(deleteSuppression));
