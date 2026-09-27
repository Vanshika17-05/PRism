import crypto from "node:crypto";
import { env } from "../config/env.js";

export function verifyGithubSignature(req, res, next) {
  const signature = req.get("x-hub-signature-256") || "";
  if (!Buffer.isBuffer(req.body) || !signature.startsWith("sha256="))
    return res.status(401).json({ error: "Invalid webhook signature" });
  const expected = `sha256=${crypto.createHmac("sha256", env.GITHUB_WEBHOOK_SECRET).update(req.body).digest("hex")}`;
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return res.status(401).json({ error: "Invalid webhook signature" });
  }
  return next();
}
