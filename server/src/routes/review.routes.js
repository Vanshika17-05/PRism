import { Router } from "express";
import {
  applySuggestedFix,
  dismissFinding,
  getReview,
  listReviews,
  suggestFix,
} from "../controllers/review.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const reviewRouter = Router();
reviewRouter.get("/", asyncHandler(listReviews));
reviewRouter.get("/:id", asyncHandler(getReview));
reviewRouter.patch(
  "/:id/findings/:findingId/dismiss",
  asyncHandler(dismissFinding),
);
reviewRouter.post(
  "/:id/findings/:findingId/suggest-fix",
  asyncHandler(suggestFix),
);
reviewRouter.post(
  "/:id/findings/:findingId/apply-suggestion",
  asyncHandler(applySuggestedFix),
);
