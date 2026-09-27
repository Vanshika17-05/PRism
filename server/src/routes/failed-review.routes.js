import { Router } from "express";
import {
  dismissFailedReview,
  listFailedReviews,
  retryFailedReview,
} from "../controllers/failed-review.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { roleMiddleware } from "../middleware/role.js";

export const failedReviewRouter = Router();
failedReviewRouter.get("/", roleMiddleware("member"), asyncHandler(listFailedReviews));
failedReviewRouter.post("/:id/retry", roleMiddleware("admin"), asyncHandler(retryFailedReview));
failedReviewRouter.delete("/:id", roleMiddleware("admin"), asyncHandler(dismissFailedReview));
