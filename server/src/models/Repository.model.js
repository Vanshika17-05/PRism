import mongoose from "mongoose";

const repositorySchema = new mongoose.Schema({
  githubRepoId: { type: Number, required: true, unique: true, index: true },
  fullName: { type: String, required: true, trim: true },
  owner: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  installationId: { type: Number, required: true, index: true },
  isActive: { type: Boolean, default: true },
  settings: {
    ignoredPaths: { type: [String], default: [] },
    maxFilesPerReview: { type: Number, min: 1, max: 100, default: 20 },
    severityThreshold: { type: String, enum: ["low", "medium", "high"], default: "low" }
  }
}, { timestamps: true });

export const Repository = mongoose.model("Repository", repositorySchema);
