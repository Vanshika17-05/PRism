import { Router } from "express";
import {
  csvReport,
  deleteSuppression,
  listRepos,
  listSuppressions,
  pdfReport,
  repoStats,
  updateSettings,
} from "../controllers/repo.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { roleMiddleware } from "../middleware/role.js";

export const repoRouter = Router();
repoRouter.get("/", roleMiddleware("member"), asyncHandler(listRepos));
repoRouter.get("/:id/stats", roleMiddleware("member", "repo"), asyncHandler(repoStats));
repoRouter.patch("/:id/settings", roleMiddleware("admin", "repo"), asyncHandler(updateSettings));
repoRouter.get("/:id/suppressions", roleMiddleware("member", "repo"), asyncHandler(listSuppressions));
repoRouter.delete(
  "/:id/suppressions/:patternId",
  roleMiddleware("admin", "repo"),
  asyncHandler(deleteSuppression),
);
repoRouter.get("/:id/reports.csv", roleMiddleware("member", "repo"), asyncHandler(csvReport));
repoRouter.post("/:id/reports.pdf", roleMiddleware("member", "repo"), asyncHandler(pdfReport));
