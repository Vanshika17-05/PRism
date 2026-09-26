import mongoose from "mongoose";

const failedReviewSchema = new mongoose.Schema({
  jobId: { type: String, required: true, index: true },
  queueName: { type: String, default: "reviewQueue" },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  error: { type: String, required: true },
  attemptsMade: { type: Number, default: 0 },
  failedAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

failedReviewSchema.index({ jobId: 1, failedAt: -1 });
export const FailedReview = mongoose.model("FailedReview", failedReviewSchema);
