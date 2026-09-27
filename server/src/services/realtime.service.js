import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { env } from "../config/env.js";

let io;

function sessionToken(socket) {
  const cookie = socket.handshake.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)prism_session=([^;]+)/);
  return (
    socket.handshake.auth?.token || (match ? decodeURIComponent(match[1]) : "")
  );
}

export function initializeRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: [env.CLIENT_URL, env.APP_URL], credentials: true },
  });
  io.use((socket, next) => {
    try {
      socket.data.user = jwt.verify(sessionToken(socket), env.JWT_SECRET);
      next();
    } catch {
      next(new Error("Authentication required"));
    }
  });
  io.on("connection", (socket) => {
    socket.on("reviews:subscribe", (repositoryIds = []) => {
      for (const id of repositoryIds.slice(0, 100)) socket.join(`repo:${id}`);
    });
    socket.on("reviews:unsubscribe", (repositoryIds = []) => {
      for (const id of repositoryIds.slice(0, 100)) socket.leave(`repo:${id}`);
    });
  });
  return io;
}

export function emitReviewProgress(repositoryId, event, payload) {
  io?.to(`repo:${repositoryId}`).emit(event, {
    repositoryId: String(repositoryId),
    ...payload,
  });
}
