import { Router } from "express";
import { localDownload } from "../controllers/report.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
export const storageRouter = Router();
storageRouter.get("/download", asyncHandler(localDownload));
