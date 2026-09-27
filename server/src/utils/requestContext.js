import { AsyncLocalStorage } from "node:async_hooks";
import crypto from "node:crypto";

export const requestContext = new AsyncLocalStorage();
export const currentRequestId = () => requestContext.getStore()?.requestId;

export function requestContextMiddleware(req, res, next) {
  const requestId = req.get("x-request-id") || crypto.randomUUID();
  res.setHeader("x-request-id", requestId);
  requestContext.run({ requestId }, next);
}
