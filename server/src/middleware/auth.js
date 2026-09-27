import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { readSessionCookie } from "../controllers/auth.controller.js";
import { isSessionActive } from "../services/session.service.js";

export async function authMiddleware(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : readSessionCookie(req);
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    req.user = jwt.verify(token, env.JWT_SECRET);
    if (!(await isSessionActive(req.user._id || req.user.id, req.user.jti)))
      return res.status(401).json({ error: "Session has been revoked" });
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}
