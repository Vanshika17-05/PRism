import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function authMiddleware(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    req.user = jwt.verify(token, env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}
