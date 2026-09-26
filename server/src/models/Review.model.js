import mongoose from "mongoose";

const findingSchema = new mongoose.Schema({
  file: { type: String, required: true }, line: { type: Number, required: true },
  severity: { type: String, enum: ["low", "medium", "high"], required: true },
  category: { type: String, enum: ["bug", "security", "performance", "style", "maintainability"], required: true },
  title: { type: String, required: true }, body: { type: String, required: true }, suggestion: { type: String, default: "" },
  confidence: { type: Number, min: 0, max: 100, default: 0 }, similarToReviewId: { type: String, default: "" },
  similarity: { type: Number, min: 0, max: 1 }, dismissed: { type: Boolean, default: false }, dismissalReason: { type: String, default: "" }, posted: { type: Boolean, default: false }
});

const complexitySchema = new mongoose.Schema({
  path: String, complexityScore: Number, maintainabilityIndex: Number, linesOfCode: Number, commentRatio: Number
}, { _id: false });

const reviewSchema = new mongoose.Schema({
  repository: { type: mongoose.Schema.Types.ObjectId, ref: "Repository", required: true, index: true },
  prNumber: { type: Number, required: true }, prTitle: { type: String, required: true }, prUrl: { type: String, required: true },
  prAuthor: { type: String, required: true }, headSha: { type: String, required: true }, deliveryId: { type: String, unique: true, sparse: true },
  status: { type: String, enum: ["pending", "processing", "completed", "failed", "skipped"], default: "pending", index: true },
  summary: { type: String, default: "" }, overallRating: { type: String, enum: ["approve", "comment", "request_changes"], default: "comment" },
  findings: { type: [findingSchema], default: [] },
  fileComplexity: { type: [complexitySchema], default: [] },
  stats: { filesReviewed: { type: Number, default: 0 }, filesSkipped: { type: Number, default: 0 }, findingsCount: { type: Number, default: 0 }, suppressedCount: { type: Number, default: 0 }, tokensIn: { type: Number, default: 0 }, tokensOut: { type: Number, default: 0 }, durationMs: { type: Number, default: 0 } },
  githubReviewId: Number, error: { type: String, default: "" }
}, { timestamps: true });

reviewSchema.index({ repository: 1, createdAt: -1 });
reviewSchema.index({ repository: 1, prNumber: 1, headSha: 1 }, { unique: true });
export const Review = mongoose.model("Review", reviewSchema);
