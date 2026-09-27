import mongoose from "mongoose";
import { z } from "zod";
import { env } from "../config/env.js";
import { FailedReview } from "../models/FailedReview.model.js";
import { mockFailedReviews } from "../data/mockData.js";
import { enqueueReview } from "../queues/review.queue.js";
import { logAudit } from "../services/audit.service.js";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function listFailedReviews(req, res) {
  const { page, limit } = querySchema.parse(req.query);
  const skip = (page - 1) * limit;
  if (env.USE_MOCKS)
    return res.json({
      items: mockFailedReviews.slice(skip, skip + limit),
      pagination: {
        page,
        limit,
        total: mockFailedReviews.length,
        pages: Math.max(1, Math.ceil(mockFailedReviews.length / limit)),
      },
    });
  const [items, total] = await Promise.all([
    FailedReview.find().sort({ failedAt: -1 }).skip(skip).limit(limit).lean(),
    FailedReview.countDocuments(),
  ]);
  return res.json({
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

export async function retryFailedReview(req, res) {
  const entry = env.USE_MOCKS
    ? mockFailedReviews.find((item) => item._id === req.params.id)
    : mongoose.isValidObjectId(req.params.id)
      ? await FailedReview.findById(req.params.id)
      : null;
  if (!entry) return res.status(404).json({ error: "Failed review not found" });
  const job = await enqueueReview(entry.payload);
  if (env.USE_MOCKS)
    mockFailedReviews.splice(mockFailedReviews.indexOf(entry), 1);
  else await entry.deleteOne();
  await logAudit({
    req,
    action: "review.retried",
    targetType: "failed_review",
    targetId: entry._id,
    before: { attemptsMade: entry.attemptsMade, error: entry.error },
    after: { jobId: String(job.id) },
  });
  return res.status(202).json({ accepted: true, jobId: String(job.id) });
}

export async function dismissFailedReview(req, res) {
  if (env.USE_MOCKS) {
    const index = mockFailedReviews.findIndex(
      (item) => item._id === req.params.id,
    );
    if (index < 0)
      return res.status(404).json({ error: "Failed review not found" });
    const [entry] = mockFailedReviews.splice(index, 1);
    await logAudit({
      req,
      action: "failed_review.dismissed",
      targetType: "failed_review",
      targetId: entry._id,
      before: { attemptsMade: entry.attemptsMade, error: entry.error },
    });
    return res.status(204).end();
  }
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(404).json({ error: "Failed review not found" });
  const entry = await FailedReview.findById(req.params.id);
  if (!entry) return res.status(404).json({ error: "Failed review not found" });
  await entry.deleteOne();
  await logAudit({
    req,
    action: "failed_review.dismissed",
    targetType: "failed_review",
    targetId: entry._id,
    before: { attemptsMade: entry.attemptsMade, error: entry.error },
  });
  return res.status(204).end();
}
