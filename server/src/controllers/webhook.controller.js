import { Repository } from "../models/Repository.model.js";
import { Review } from "../models/Review.model.js";
import { enqueueReview } from "../queues/review.queue.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";
import { currentRequestId } from "../utils/requestContext.js";
import { mockRepositories } from "../data/mockData.js";

const reviewActions = new Set([
  "opened",
  "synchronize",
  "reopened",
  "ready_for_review",
]);

function repoData(repository, installationId) {
  return {
    githubRepoId: repository.id,
    fullName: repository.full_name,
    owner: repository.owner.login,
    name: repository.name,
    installationId,
  };
}

function repositoryUpdate(repository, installationId, activate = false) {
  const update = {
    $set: {
      ...repoData(repository, installationId),
    },
  };
  if (activate) update.$set.isActive = true;
  else update.$setOnInsert = { isActive: true };
  return update;
}

async function processWebhook({ payload, event, deliveryId }) {
  if (env.USE_MOCKS)
    return logger.info({ event, deliveryId }, "Accepted mock GitHub webhook");

  if (event === "installation" || event === "installation_repositories") {
    const installationId = payload.installation?.id;
    if (event === "installation" && payload.action === "deleted") {
      await Repository.updateMany({ installationId }, { isActive: false });
      return;
    }
    const added = payload.repositories_added || payload.repositories || [];
    const removed = payload.repositories_removed || [];
    await Promise.all(
      added.map((repo) =>
        Repository.findOneAndUpdate(
          { githubRepoId: repo.id },
          repositoryUpdate(repo, installationId, true),
          { upsert: true, new: true, setDefaultsOnInsert: true },
        ),
      ),
    );
    await Repository.updateMany(
      { githubRepoId: { $in: removed.map((repo) => repo.id) } },
      { isActive: false },
    );
    return;
  }

  const repository = await Repository.findOneAndUpdate(
    { githubRepoId: payload.repository.id },
    repositoryUpdate(payload.repository, payload.installation.id),
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const duplicate = await Review.exists({
    $or: [
      { deliveryId },
      {
        repository: repository.id,
        prNumber: payload.pull_request.number,
        headSha: payload.pull_request.head.sha,
      },
    ],
  });
  if (duplicate) return;
  const pullRequest = payload.pull_request;
  await enqueueReview({
    repoId: String(repository.id),
    prNumber: pullRequest.number,
    headSha: pullRequest.head.sha,
    deliveryId,
    requestId: currentRequestId(),
    enqueuedAt: Date.now(),
  });
  logger.info(
    { deliveryId, repoId: repository.id, prNumber: pullRequest.number },
    "Review queued",
  );
}

export async function handleGithubWebhook(req, res) {
  let payload;
  try {
    payload = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }
  const event = req.get("x-github-event");
  const deliveryId = req.get("x-github-delivery");
  if (!deliveryId)
    return res.status(400).json({ error: "Missing GitHub delivery ID" });
  const supportedInstallation =
    event === "installation" || event === "installation_repositories";
  const supportedPullRequest =
    event === "pull_request" &&
    reviewActions.has(payload.action) &&
    !payload.pull_request?.draft;
  if (!supportedInstallation && !supportedPullRequest)
    return res.status(200).json({ ignored: true });
  if (supportedPullRequest && payload.repository?.id) {
    const repository = env.USE_MOCKS
      ? mockRepositories.find(
          (item) => item.githubRepoId === payload.repository.id,
        )
      : await Repository.findOne({ githubRepoId: payload.repository.id })
          .select("isActive")
          .lean();
    if (repository?.isActive === false)
      return res
        .status(200)
        .json({ skipped: true, reason: "reviews_paused" });
  }
  res.status(202).json({ accepted: true });
  setImmediate(() =>
    processWebhook({ payload, event, deliveryId }).catch((error) =>
      logger.error(
        { err: error, deliveryId },
        "Asynchronous webhook processing failed",
      ),
    ),
  );
}
