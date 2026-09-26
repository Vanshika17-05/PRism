import { Repository } from "../models/Repository.model.js";
import { Review } from "../models/Review.model.js";
import { processPullRequestReview } from "../services/review.service.js";
import { logger } from "../utils/logger.js";

const reviewActions = new Set(["opened", "synchronize", "reopened", "ready_for_review"]);

function repoData(repository, installationId) {
  return { githubRepoId: repository.id, fullName: repository.full_name, owner: repository.owner.login, name: repository.name, installationId, isActive: true };
}

export async function handleGithubWebhook(req, res) {
  let payload;
  try { payload = JSON.parse(req.body.toString("utf8")); }
  catch { return res.status(400).json({ error: "Invalid JSON payload" }); }
  const event = req.get("x-github-event");
  const deliveryId = req.get("x-github-delivery");
  if (!deliveryId) return res.status(400).json({ error: "Missing GitHub delivery ID" });

  if (event === "installation" || event === "installation_repositories") {
    const installationId = payload.installation?.id;
    const added = payload.repositories_added || payload.repositories || [];
    const removed = payload.repositories_removed || [];
    await Promise.all(added.map((repo) => Repository.findOneAndUpdate({ githubRepoId: repo.id }, repoData(repo, installationId), { upsert: true, new: true, setDefaultsOnInsert: true })));
    await Repository.updateMany({ githubRepoId: { $in: removed.map((repo) => repo.id) } }, { isActive: false });
    if (event === "installation" && payload.action === "deleted") await Repository.updateMany({ installationId }, { isActive: false });
    return res.status(200).json({ accepted: true });
  }

  if (event !== "pull_request" || !reviewActions.has(payload.action) || payload.pull_request?.draft) return res.status(200).json({ ignored: true });
  const repository = await Repository.findOneAndUpdate(
    { githubRepoId: payload.repository.id }, repoData(payload.repository, payload.installation.id), { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const duplicate = await Review.exists({ $or: [{ deliveryId }, { repository: repository.id, prNumber: payload.pull_request.number, headSha: payload.pull_request.head.sha }] });
  if (duplicate) return res.status(200).json({ ignored: true, reason: "duplicate" });
  res.status(202).json({ accepted: true });
  setImmediate(() => processPullRequestReview({ repository, pullRequest: payload.pull_request, deliveryId })
    .catch((error) => logger.error({ err: error, deliveryId, repository: repository.fullName }, "Asynchronous review failed")));
}
