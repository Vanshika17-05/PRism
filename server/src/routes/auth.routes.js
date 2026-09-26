import { Router } from "express";
import { login, logout, me, register } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authRouter = Router();
authRouter.post("/register", asyncHandler(register));
authRouter.post("/login", asyncHandler(login));
authRouter.post("/logout", authMiddleware, logout);
authRouter.get("/me", authMiddleware, me);
