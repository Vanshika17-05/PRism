import { Router } from "express";
import {
  authConfig,
  beginGithubAuth,
  githubCallback,
  logout,
  me,
  removeOtherSessions,
  removeSession,
  sessions,
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { oauthCallbackLimiter } from "../middleware/rateLimits.js";
import { authenticatedUserLimiter } from "../middleware/rateLimits.js";

export const authRouter = Router();
authRouter.get("/config", authConfig);
authRouter.get("/github", beginGithubAuth);
authRouter.get(
  "/github/callback",
  oauthCallbackLimiter,
  asyncHandler(githubCallback),
);
authRouter.post(
  "/logout",
  authMiddleware,
  authenticatedUserLimiter,
  asyncHandler(logout),
);
authRouter.get("/me", authMiddleware, authenticatedUserLimiter, me);
authRouter.get(
  "/sessions",
  authMiddleware,
  authenticatedUserLimiter,
  asyncHandler(sessions),
);
authRouter.delete(
  "/sessions/:jti",
  authMiddleware,
  authenticatedUserLimiter,
  asyncHandler(removeSession),
);
authRouter.post(
  "/sessions/revoke-others",
  authMiddleware,
  authenticatedUserLimiter,
  asyncHandler(removeOtherSessions),
);
