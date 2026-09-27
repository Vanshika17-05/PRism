import { Router } from "express";
import {
  applySuggestedFix,
  dismissFinding,
  getReview,
  listReviews,
  suggestFix,
} from "../controllers/review.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { roleMiddleware } from "../middleware/role.js";

export const reviewRouter = Router();
reviewRouter.get("/", roleMiddleware("member"), asyncHandler(listReviews));
reviewRouter.get("/:id", roleMiddleware("member", "review"), asyncHandler(getReview));
reviewRouter.patch(
  "/:id/findings/:findingId/dismiss",
  roleMiddleware("admin", "review"),
  asyncHandler(dismissFinding),
);
reviewRouter.post(
  "/:id/findings/:findingId/suggest-fix",
  roleMiddleware("admin", "review"),
  asyncHandler(suggestFix),
);
reviewRouter.post(
  "/:id/findings/:findingId/apply-suggestion",
  roleMiddleware("admin", "review"),
  asyncHandler(applySuggestedFix),
);
