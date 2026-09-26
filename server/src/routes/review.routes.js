import { Router } from "express";
import { dismissFinding, getReview, listReviews } from "../controllers/review.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const reviewRouter = Router();
reviewRouter.get("/", asyncHandler(listReviews));
reviewRouter.get("/:id", asyncHandler(getReview));
reviewRouter.patch("/:id/findings/:findingId/dismiss", asyncHandler(dismissFinding));
