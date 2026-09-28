import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: { type: String, enum: ["owner", "admin", "member"], required: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: { type: [memberSchema], default: [] },
    hasCompletedOnboarding: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Organization = mongoose.model("Organization", organizationSchema);
