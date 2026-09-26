import mongoose from "mongoose";
import { z } from "zod";
import { Review } from "../models/Review.model.js";

const querySchema = z.object({ repo: z.string().optional(), status: z.enum(["pending", "processing", "completed", "failed", "skipped"]).optional(), page: z.coerce.number().int().min(1).default(1) });

export async function listReviews(req, res) {
  const query = querySchema.parse(req.query);
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.repo && mongoose.isValidObjectId(query.repo)) filter.repository = query.repo;
  const limit = 20; const skip = (query.page - 1) * limit;
  const [items, total] = await Promise.all([Review.find(filter).populate("repository", "fullName").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), Review.countDocuments(filter)]);
  res.json({ items, pagination: { page: query.page, pages: Math.ceil(total / limit), total, limit } });
}

export async function getReview(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Review not found" });
  const review = await Review.findById(req.params.id).populate("repository").lean();
  if (!review) return res.status(404).json({ error: "Review not found" });
  res.json({ review });
}
