import mongoose from "mongoose";

const repositorySchema = new mongoose.Schema(
  {
    githubRepoId: { type: Number, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    owner: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    installationId: { type: Number, required: true, index: true },
    isActive: { type: Boolean, default: true },
    settings: {
      ignoredPaths: { type: [String], default: [] },
      maxFilesPerReview: { type: Number, min: 1, max: 100, default: 20 },
      severityThreshold: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "low",
      },
      persona: {
        type: String,
        enum: ["strict", "balanced", "friendly"],
        default: "balanced",
      },
      aiProvider: {
        type: String,
        enum: ["openai", "gemini", "claude"],
        default: "openai",
      },
      customRules: { type: [String], default: [] },
      monthlyTokenBudget: {
        type: Number,
        min: 0,
        max: 100_000_000,
        default: 500_000,
      },
      tokensUsedThisMonth: { type: Number, min: 0, default: 0 },
      budgetMonth: {
        type: String,
        default: () => new Date().toISOString().slice(0, 7),
      },
    },
  },
  { timestamps: true },
);

export const Repository = mongoose.model("Repository", repositorySchema);
