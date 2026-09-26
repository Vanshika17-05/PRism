import { Router } from "express";
import { dismissFailedReview, listFailedReviews, retryFailedReview } from "../controllers/failed-review.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const failedReviewRouter = Router();
failedReviewRouter.get("/", asyncHandler(listFailedReviews));
failedReviewRouter.post("/:id/retry", asyncHandler(retryFailedReview));
failedReviewRouter.delete("/:id", asyncHandler(dismissFailedReview));
