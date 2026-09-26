import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  logger.info("MongoDB connected");
  return mongoose.connection;
}

export function databaseState() {
  return ["disconnected", "connected", "connecting", "disconnecting"][mongoose.connection.readyState] || "unknown";
}
