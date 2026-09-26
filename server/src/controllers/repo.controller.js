import mongoose from "mongoose";
import { Repository } from "../models/Repository.model.js";
import { Review } from "../models/Review.model.js";
import { env } from "../config/env.js";
import { mockRepositories, mockReviews, mockStatsFor, mockSuppressions } from "../data/mockData.js";
import { z } from "zod";
import { deleteSuppressionPattern, listSuppressionPatterns } from "../services/python.service.js";

const settingsSchema = z.object({
  ignoredPaths: z.array(z.string().min(1).max(200)).max(100).optional(),
  maxFilesPerReview: z.number().int().min(1).max(100).optional(),
  severityThreshold: z.enum(["low", "medium", "high"]).optional(),
  persona: z.enum(["strict", "balanced", "friendly"]).optional(),
  customRules: z.array(z.string().min(1).max(300)).max(50).optional(),
  isActive: z.boolean().optional()
});

export async function listRepos(_req, res) {
  if (env.USE_MOCKS) return res.json({ repositories: mockRepositories });
  res.json({ repositories: await Repository.find().sort({ fullName: 1 }).lean() });
}

export async function repoStats(req, res) {
  if (env.USE_MOCKS) {
    const stats = mockStatsFor(req.params.id);
    if (stats) stats.signalAccuracy = accuracyFor(mockReviews.filter((item) => item.repository._id === req.params.id));
    return stats ? res.json(stats) : res.status(404).json({ error: "Repository not found" });
  }
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
  const reviews = await Review.find({ repository: repository._id }).select("prAuthor findings stats createdAt").lean();
  const high = reviews.reduce((sum, item) => sum + item.findings.filter((finding) => finding.severity === "high" && !finding.dismissed).length, 0);
  const medium = reviews.reduce((sum, item) => sum + item.findings.filter((finding) => finding.severity === "medium" && !finding.dismissed).length, 0);
  const total = summary.totalFindings || 0; const count = summary.totalReviews || 0;
  const codeHealthScore = count ? Math.max(0, Math.round(100 - ((high * 8 + medium * 3 + Math.max(0, total - high - medium)) / count) * 2)) : 100;
  const contributors = new Map();
  reviews.forEach((item) => { const current = contributors.get(item.prAuthor) || { name: item.prAuthor, reviews: 0, high: 0 }; current.reviews += 1; current.high += item.findings.filter((finding) => finding.severity === "high" && !finding.dismissed).length; contributors.set(item.prAuthor, current); });
  res.json({ repository, summary: { totalReviews: count, completedReviews: summary.completedReviews || 0, totalFindings: total, averageDurationMs: Math.round(summary.averageDurationMs || 0), codeHealthScore }, findingsBySeverity: severities, findingsByCategory: categories, reviewsPerDay: timeline, contributorLeaderboard: [...contributors.values()].sort((a, b) => a.high - b.high || b.reviews - a.reviews), signalAccuracy: accuracyFor(reviews) });
}

function accuracyFor(reviews) {
  const now = Date.now(); const day = 86_400_000;
  const calculate = (from, to) => { const findings = reviews.filter((review) => { const age = now - new Date(review.createdAt).getTime(); return age >= from && age < to; }).flatMap((review) => review.findings || []); return findings.length ? Math.round(((findings.length - findings.filter((item) => item.dismissed).length) / findings.length) * 100) : 100; };
  const value = calculate(0, 30 * day); const previous = calculate(30 * day, 60 * day);
  return { value, previous, trend: value === previous ? "flat" : value > previous ? "up" : "down" };
}

export async function updateSettings(req, res) {
  const input = settingsSchema.parse(req.body);
  if (env.USE_MOCKS) {
    const repository = mockRepositories.find((item) => item._id === req.params.id);
    if (!repository) return res.status(404).json({ error: "Repository not found" });
    if (typeof input.isActive === "boolean") repository.isActive = input.isActive;
    repository.settings = { ...repository.settings, ...Object.fromEntries(Object.entries(input).filter(([key]) => key !== "isActive")) };
    return res.json({ repository });
  }
  const repository = await Repository.findById(req.params.id);
  if (!repository) return res.status(404).json({ error: "Repository not found" });
  if (typeof input.isActive === "boolean") repository.isActive = input.isActive;
  Object.entries(input).filter(([key]) => key !== "isActive").forEach(([key, value]) => { repository.settings[key] = value; });
  await repository.save();
  return res.json({ repository });
}

export async function listSuppressions(req, res) {
  if (env.USE_MOCKS) return res.json({ patterns: mockSuppressions.filter((item) => item.repoId === req.params.id) });
  if (!await Repository.exists({ _id: req.params.id })) return res.status(404).json({ error: "Repository not found" });
  return res.json(await listSuppressionPatterns(req.params.id));
}

export async function deleteSuppression(req, res) {
  if (env.USE_MOCKS) {
    const index = mockSuppressions.findIndex((item) => item.repoId === req.params.id && item.id === req.params.patternId);
    if (index < 0) return res.status(404).json({ error: "Suppression pattern not found" });
    mockSuppressions.splice(index, 1); return res.json({ deleted: true });
  }
  return res.json(await deleteSuppressionPattern(req.params.id, req.params.patternId));
}
