import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    githubId: { type: Number, required: true, unique: true, index: true },
    username: { type: String, required: true, trim: true },
    displayName: { type: String, trim: true, maxlength: 50, default: "" },
    avatarUrl: { type: String, default: "" },
    githubAvatarUrl: { type: String, default: "" },
    avatarStorageKey: { type: String, default: "", select: false },
    githubUrl: { type: String, default: "" },
    email: { type: String, default: "", lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    githubAccessToken: { type: String, select: false },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
