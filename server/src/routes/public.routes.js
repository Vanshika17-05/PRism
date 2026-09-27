import { Router } from "express";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Repository } from "../models/Repository.model.js";
import { Review } from "../models/Review.model.js";
import { mockRepositories, mockStatsFor } from "../data/mockData.js";

export const publicRouter = Router();
publicRouter.get("/repos/:id/score", async (req, res) => {
  if (env.USE_MOCKS) {
    const repository = mockRepositories.find(
      (item) => item._id === req.params.id,
    );
    if (!repository)
      return res.status(404).json({ error: "Repository not found" });
    return res.json({
      repository: repository.fullName,
      score: mockStatsFor(repository._id).summary.codeHealthScore,
    });
  }
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(404).json({ error: "Repository not found" });
  const repository = await Repository.findById(req.params.id).lean();
  if (!repository)
    return res.status(404).json({ error: "Repository not found" });
  const reviews = await Review.find({
    repository: repository._id,
    status: "completed",
  })
    .select("findings")
    .lean();
  const findings = reviews.flatMap((item) => item.findings);
  const high = findings.filter(
    (item) => item.severity === "high" && !item.dismissed,
  ).length;
  const score = reviews.length
    ? Math.max(
        0,
        Math.round(
          100 -
            ((high * 8 + Math.max(0, findings.length - high)) /
              reviews.length) *
              2,
        ),
      )
    : 100;
  res
    .set("Cache-Control", "public, max-age=60")
    .json({ repository: repository.fullName, score });
});
