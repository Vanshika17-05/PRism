import mongoose from "mongoose";
import { Repository } from "../models/Repository.model.js";
import { Review } from "../models/Review.model.js";

export async function listRepos(_req, res) {
  res.json({ repositories: await Repository.find().sort({ fullName: 1 }).lean() });
}

export async function repoStats(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Repository not found" });
  const repository = await Repository.findById(req.params.id).lean();
  if (!repository) return res.status(404).json({ error: "Repository not found" });
  const since = new Date(); since.setUTCDate(since.getUTCDate() - 13); since.setUTCHours(0, 0, 0, 0);
  const [summary = {}, severities, categories, timeline] = await Promise.all([
    Review.aggregate([{ $match: { repository: repository._id } }, { $group: { _id: null, totalReviews: { $sum: 1 }, completedReviews: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } }, totalFindings: { $sum: "$stats.findingsCount" }, averageDurationMs: { $avg: "$stats.durationMs" } } }]).then((rows) => rows[0]),
    Review.aggregate([{ $match: { repository: repository._id } }, { $unwind: "$findings" }, { $group: { _id: "$findings.severity", count: { $sum: 1 } } }]),
    Review.aggregate([{ $match: { repository: repository._id } }, { $unwind: "$findings" }, { $group: { _id: "$findings.category", count: { $sum: 1 } } }]),
    Review.aggregate([{ $match: { repository: repository._id, createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }])
  ]);
  res.json({ repository, summary: { totalReviews: summary.totalReviews || 0, completedReviews: summary.completedReviews || 0, totalFindings: summary.totalFindings || 0, averageDurationMs: Math.round(summary.averageDurationMs || 0) }, findingsBySeverity: severities, findingsByCategory: categories, reviewsPerDay: timeline });
}
