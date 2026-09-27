import mongoose from "mongoose";
import { z } from "zod";
import { Review } from "../models/Review.model.js";
import { env } from "../config/env.js";
import { mockRepositories, mockReviews, mockSuppressions } from "../data/mockData.js";
import { storeKnownNonIssue } from "../services/python.service.js";
import { logger } from "../utils/logger.js";
import {
  getInstallationOctokit,
  loadFileContent,
  postSuggestionComment,
} from "../services/github.service.js";
import { runFixAgent } from "../services/fix-agent.service.js";
/** @typedef {import("@prism/shared-types").Review} ReviewContract */

const dismissSchema = z.object({
  dismissed: z.boolean().default(true),
  reason: z.string().max(1000).optional().default(""),
});

const querySchema = z.object({
  repo: z.string().optional(),
  status: z
    .enum(["pending", "processing", "completed", "failed", "skipped"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export async function listReviews(req, res) {
  const query = querySchema.parse(req.query);
  if (env.USE_MOCKS) {
    const filtered = mockReviews.filter(
      (review) =>
        mockRepositories.find((repo) => repo._id === review.repository._id)
          ?.organizationId === String(req.organization._id) &&
        (!query.status || review.status === query.status) &&
        (!query.repo || review.repository._id === query.repo),
    );
    const limit = 20;
    const start = (query.page - 1) * limit;
    return res.json({
      items: filtered.slice(start, start + limit),
      pagination: {
        page: query.page,
        pages: Math.max(1, Math.ceil(filtered.length / limit)),
        total: filtered.length,
        limit,
      },
    });
  }
  const organizationRepos = await (await import("../models/Repository.model.js")).Repository.find({ organizationId: req.organization._id }).distinct("_id");
  const filter = { repository: { $in: organizationRepos } };
  if (query.status) filter.status = query.status;
  if (query.repo && mongoose.isValidObjectId(query.repo))
    filter.repository = query.repo;
  const limit = 20;
  const skip = (query.page - 1) * limit;
  const [items, total] = await Promise.all([
    Review.find(filter)
      .populate("repository", "fullName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);
  res.json({
    items,
    pagination: {
      page: query.page,
      pages: Math.ceil(total / limit),
      total,
      limit,
    },
  });
}

export async function getReview(req, res) {
  if (env.USE_MOCKS) {
    const review = mockReviews.find((item) => item._id === req.params.id);
    return review
      ? res.json({ review })
      : res.status(404).json({ error: "Review not found" });
  }
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(404).json({ error: "Review not found" });
  const review = await Review.findById(req.params.id)
    .populate("repository")
    .lean();
  if (!review) return res.status(404).json({ error: "Review not found" });
  res.json({ review });
}

export async function dismissFinding(req, res) {
  const input = dismissSchema.parse(req.body);
  if (env.USE_MOCKS) {
    const review = mockReviews.find((item) => item._id === req.params.id);
    const finding = review?.findings.find(
      (item) => item._id === req.params.findingId,
    );
    if (!finding) return res.status(404).json({ error: "Finding not found" });
    // Deterministic lint violations are facts about the code, not learned AI judgments, so they never enter vector suppression.
    if (finding.source !== "ai" && input.dismissed)
      return res
        .status(400)
        .json({ error: "Deterministic findings cannot be suppressed" });
    finding.dismissed = input.dismissed;
    finding.dismissalReason = input.dismissed ? input.reason : "";
    if (
      input.dismissed &&
      !mockSuppressions.some((item) => item.findingId === finding._id)
    )
      mockSuppressions.push({
        id: `mock-suppression-${Date.now()}`,
        repoId: review.repository._id,
        reviewId: review._id,
        findingId: finding._id,
        file: finding.file,
        text: `${finding.title}. ${finding.body}`,
        reason: input.reason,
        type: "known_non_issue",
      });
    return res.json({ finding, learningStored: input.dismissed });
  }
  if (
    !mongoose.isValidObjectId(req.params.id) ||
    !mongoose.isValidObjectId(req.params.findingId)
  )
    return res.status(404).json({ error: "Finding not found" });
  const review = await Review.findById(req.params.id);
  const finding = review?.findings.id(req.params.findingId);
  if (!finding) return res.status(404).json({ error: "Finding not found" });
  // Deterministic lint violations must be fixed (or configured at the linter); feedback suppression applies only to AI judgments.
  if (finding.source !== "ai" && input.dismissed)
    return res
      .status(400)
      .json({ error: "Deterministic findings cannot be suppressed" });
  finding.dismissed = input.dismissed;
  finding.dismissalReason = input.dismissed ? input.reason : "";
  await review.save();
  let learningStored = false;
  if (input.dismissed) {
    try {
      await storeKnownNonIssue({
        repoId: review.repository,
        reviewId: review.id,
        finding,
        reason: input.reason,
      });
      learningStored = true;
    } catch (error) {
      logger.warn(
        { err: error, reviewId: review.id, findingId: finding.id },
        "Could not store suppression feedback",
      );
    }
  }
  return res.json({ finding, learningStored });
}

export async function suggestFix(req, res) {
  if (env.USE_MOCKS) {
    const review = mockReviews.find((item) => item._id === req.params.id);
    const finding = review?.findings.find(
      (item) => item._id === req.params.findingId,
    );
    if (!finding) return res.status(404).json({ error: "Finding not found" });
    return res.json({
      patch:
        finding.suggestion || `// Apply a targeted fix for: ${finding.title}`,
      suggestion: finding.suggestion || "// Validated mock suggestion",
      validated: true,
      steps: ["fetched", "proposed", "validated"],
    });
  }
  const review = await Review.findById(req.params.id).populate("repository");
  const finding = review?.findings.id(req.params.findingId);
  if (!finding) return res.status(404).json({ error: "Finding not found" });
  const repository = review.repository;
  const octokit = await getInstallationOctokit(repository.installationId);
  const content = await loadFileContent(
    octokit,
    repository.owner,
    repository.name,
    review.headSha,
    finding.file,
  );
  const result = await runFixAgent({
    provider: repository.settings.aiProvider || "openai",
    finding,
    fileContent: content,
  });
  res.json({
    ...result,
    suggestion: finding.suggestion || result.resultingContent,
    steps: ["fetched", "proposed", "validated"],
  });
}

export async function applySuggestedFix(req, res) {
  const input = z
    .object({ suggestion: z.string().min(1).max(100_000) })
    .parse(req.body);
  if (env.USE_MOCKS) return res.json({ posted: true });
  const review = await Review.findById(req.params.id).populate("repository");
  const finding = review?.findings.id(req.params.findingId);
  if (!finding) return res.status(404).json({ error: "Finding not found" });
  const repository = review.repository;
  const octokit = await getInstallationOctokit(repository.installationId);
  await postSuggestionComment(octokit, {
    owner: repository.owner,
    repo: repository.name,
    prNumber: review.prNumber,
    headSha: review.headSha,
    file: finding.file,
    line: finding.line,
    suggestion: input.suggestion,
  });
  res.json({ posted: true });
}
