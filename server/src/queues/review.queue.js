import { Queue, Worker } from "bullmq";
import { env } from "../config/env.js";
import { Repository } from "../models/Repository.model.js";
import { FailedReview } from "../models/FailedReview.model.js";
import { processPullRequestReview } from "../services/review.service.js";
import { getInstallationOctokit } from "../services/github.service.js";
import { githubBucket } from "../services/rate-limit.service.js";
import { logger } from "../utils/logger.js";
import { mockFailedReviews, mockRepositories } from "../data/mockData.js";
import { requestContext } from "../utils/requestContext.js";
import { emitReviewProgress } from "../services/realtime.service.js";

export const REVIEW_QUEUE_NAME = "reviewQueue";
const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5_000 },
  removeOnComplete: 100,
  removeOnFail: false,
};
let queue;
let worker;
let mockSequence = 0;

function redisConnection() {
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    tls: url.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

export function getReviewQueue() {
  if (env.USE_MOCKS) return null;
  queue ||= new Queue(REVIEW_QUEUE_NAME, {
    connection: redisConnection(),
    defaultJobOptions,
  });
  return queue;
}

export async function recordFailedReview(job, error) {
  const entry = {
    jobId: String(job.id),
    queueName: REVIEW_QUEUE_NAME,
    payload: job.data,
    error: String(error?.message || error || "Review job failed").slice(
      0,
      4000,
    ),
    attemptsMade: job.attemptsMade || 3,
    failedAt: new Date(),
  };
  if (env.USE_MOCKS) {
    const stored = {
      ...entry,
      _id: `mock-failed-${Date.now()}-${++mockSequence}`,
    };
    mockFailedReviews.unshift(stored);
    return stored;
  }
  return FailedReview.create(entry);
}

export async function runReviewJob(data) {
  if (data.forceFailure)
    throw new Error(
      data.failureMessage ||
        "Forced review failure for dead-letter verification",
    );
  const repository = env.USE_MOCKS
    ? mockRepositories.find((item) => item._id === data.repoId)
    : await Repository.findById(data.repoId);
  if (!repository)
    throw new Error(`Repository ${data.repoId} no longer exists`);
  const octokit = await getInstallationOctokit(repository.installationId);
  await githubBucket.acquire();
  const { data: pullRequest } = await octokit.rest.pulls.get({
    owner: repository.owner,
    repo: repository.name,
    pull_number: data.prNumber,
  });
  if (pullRequest.head.sha !== data.headSha)
    throw new Error(
      "Queued head SHA is stale; a newer PR revision is available",
    );
  emitReviewProgress(repository.id || repository._id, "review:started", {
    prNumber: data.prNumber,
  });
  try {
    const review = await processPullRequestReview({
      repository,
      pullRequest,
      deliveryId: data.deliveryId,
      queueWaitMs: data.enqueuedAt
        ? Math.max(0, Date.now() - data.enqueuedAt)
        : 0,
      onProgress: (payload) =>
        emitReviewProgress(
          repository.id || repository._id,
          "review:analyzing",
          payload,
        ),
    });
    emitReviewProgress(repository.id || repository._id, "review:completed", {
      reviewId: review.id || review._id,
      prNumber: data.prNumber,
    });
    return review;
  } catch (error) {
    emitReviewProgress(repository.id || repository._id, "review:failed", {
      prNumber: data.prNumber,
      message: error.message,
    });
    throw error;
  }
}

export async function enqueueReview(payload, options = {}) {
  if (env.USE_MOCKS) {
    const id = `mock-job-${Date.now()}-${++mockSequence}`;
    if (options.processNow) {
      let error;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          await runReviewJob(payload);
          return { id };
        } catch (caught) {
          error = caught;
        }
      }
      await recordFailedReview({ id, data: payload, attemptsMade: 3 }, error);
    }
    return { id };
  }
  return getReviewQueue().add("review", payload, defaultJobOptions);
}

export function startReviewWorker() {
  if (env.USE_MOCKS || worker) return worker;
  worker = new Worker(
    REVIEW_QUEUE_NAME,
    (job) =>
      requestContext.run({ requestId: job.data.requestId }, () =>
        runReviewJob(job.data),
      ),
    { connection: redisConnection(), concurrency: env.REVIEW_CONCURRENCY },
  );
  worker.on("completed", (job) =>
    logger.info({ jobId: job.id }, "Review queue job completed"),
  );
  worker.on("failed", async (job, error) => {
    logger.error(
      { err: error, jobId: job?.id, attemptsMade: job?.attemptsMade },
      "Review queue attempt failed",
    );
    if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
      try {
        await recordFailedReview(job, error);
      } catch (deadLetterError) {
        logger.error(
          { err: deadLetterError, jobId: job.id },
          "Could not persist dead-letter review",
        );
      }
    }
  });
  worker.on("error", (error) =>
    logger.error({ err: error }, "Review worker error"),
  );
  logger.info({ concurrency: env.REVIEW_CONCURRENCY }, "Review worker started");
  return worker;
}

export async function closeReviewQueue() {
  await worker?.close();
  await queue?.close();
  worker = undefined;
  queue = undefined;
}

export async function reviewQueueCounts() {
  if (env.USE_MOCKS) return { waiting: 0, active: 0, delayed: 0, depth: 0 };
  const counts = await getReviewQueue().getJobCounts(
    "waiting",
    "active",
    "delayed",
  );
  return { ...counts, depth: counts.waiting + counts.active + counts.delayed };
}
