import { Router } from "express";
import {
  authConfig,
  beginGithubAuth,
  githubCallback,
  logout,
  me,
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authRouter = Router();
authRouter.get("/config", authConfig);
authRouter.get("/github", beginGithubAuth);
authRouter.get("/github/callback", asyncHandler(githubCallback));
authRouter.post("/logout", authMiddleware, logout);
authRouter.get("/me", authMiddleware, me);
