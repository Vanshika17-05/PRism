import { Router } from "express";
import { handleGithubWebhook } from "../controllers/webhook.controller.js";
import { verifyGithubSignature } from "../middleware/verifyGithubSignature.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const webhookRouter = Router();
webhookRouter.post(
  "/",
  verifyGithubSignature,
  asyncHandler(handleGithubWebhook),
);
