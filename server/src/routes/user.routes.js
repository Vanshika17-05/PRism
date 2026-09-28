import { Router } from "express";
import multer from "multer";
import {
  avatarFile,
  updateMe,
  uploadAvatar,
} from "../controllers/user.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, done) {
    done(
      allowedTypes.has(file.mimetype)
        ? null
        : Object.assign(new Error("Avatar must be a JPG, PNG, or WebP image"), {
            status: 400,
          }),
      allowedTypes.has(file.mimetype),
    );
  },
});

export const userRouter = Router();
userRouter.patch("/me", asyncHandler(updateMe));
userRouter.post(
  "/me/avatar",
  upload.single("avatar"),
  asyncHandler(uploadAvatar),
);
userRouter.get("/avatar/:userId", asyncHandler(avatarFile));
