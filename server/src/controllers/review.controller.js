import mongoose from "mongoose";
import { z } from "zod";
import { Review } from "../models/Review.model.js";
import { env } from "../config/env.js";
import { mockReviews } from "../data/mockData.js";

const querySchema = z.object({ repo: z.string().optional(), status: z.enum(["pending", "processing", "completed", "failed", "skipped"]).optional(), page: z.coerce.number().int().min(1).default(1) });

export async function listReviews(req, res) {
  const query = querySchema.parse(req.query);
  if (env.USE_MOCKS) {
    const filtered = mockReviews.filter((review) => (!query.status || review.status === query.status) && (!query.repo || review.repository._id === query.repo));
    const limit = 20; const start = (query.page - 1) * limit;
    return res.json({ items: filtered.slice(start, start + limit), pagination: { page: query.page, pages: Math.max(1, Math.ceil(filtered.length / limit)), total: filtered.length, limit } });
  }
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.repo && mongoose.isValidObjectId(query.repo)) filter.repository = query.repo;
  const limit = 20; const skip = (query.page - 1) * limit;
  const [items, total] = await Promise.all([Review.find(filter).populate("repository", "fullName").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), Review.countDocuments(filter)]);
  res.json({ items, pagination: { page: query.page, pages: Math.ceil(total / limit), total, limit } });
}

export async function getReview(req, res) {
  if (env.USE_MOCKS) {
    const review = mockReviews.find((item) => item._id === req.params.id);
    return review ? res.json({ review }) : res.status(404).json({ error: "Review not found" });
  }
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Review not found" });
  const review = await Review.findById(req.params.id).populate("repository").lean();
  if (!review) return res.status(404).json({ error: "Review not found" });
  res.json({ review });
}

export async function dismissFinding(req, res) {
  if (env.USE_MOCKS) {
    const review = mockReviews.find((item) => item._id === req.params.id);
    const finding = review?.findings.find((item) => item._id === req.params.findingId);
    if (!finding) return res.status(404).json({ error: "Finding not found" });
    finding.dismissed = req.body.dismissed !== false;
    return res.json({ finding });
  }
  if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.findingId)) return res.status(404).json({ error: "Finding not found" });
  const review = await Review.findById(req.params.id);
  const finding = review?.findings.id(req.params.findingId);
  if (!finding) return res.status(404).json({ error: "Finding not found" });
  finding.dismissed = req.body.dismissed !== false;
  await review.save();
  return res.json({ finding });
}
