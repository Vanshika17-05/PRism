import { Router } from "express";
import { getReview, listReviews } from "../controllers/review.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const reviewRouter = Router();
reviewRouter.get("/", asyncHandler(listReviews));
reviewRouter.get("/:id", asyncHandler(getReview));
