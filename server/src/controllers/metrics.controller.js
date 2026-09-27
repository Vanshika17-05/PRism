import { env } from "../config/env.js";
import { Review } from "../models/Review.model.js";
import { mockReviews } from "../data/mockData.js";
import { reviewQueueCounts } from "../queues/review.queue.js";

function fromRows(reviews) {
  const statuses = reviews.reduce(
    (out, item) => ({ ...out, [item.status]: (out[item.status] || 0) + 1 }),
    {},
  );
  const recent = reviews.filter(
    (item) => Date.now() - new Date(item.createdAt).getTime() <= 86_400_000,
  );
  const average = (items, field) =>
    items.length
      ? Math.round(
          items.reduce((sum, item) => sum + (item.stats?.[field] || 0), 0) /
            items.length,
        )
      : 0;
  const failed = statuses.failed || 0;
  return {
    totalReviewsProcessed: reviews.length,
    reviewsByStatus: statuses,
    averageReviewDurationMs24h: average(recent, "durationMs"),
    averageQueueWaitMs: average(reviews, "queueWaitMs"),
    errorRate: reviews.length
      ? Number(((failed / reviews.length) * 100).toFixed(1))
      : 0,
  };
}

export async function getMetrics(_req, res) {
  const reviews = env.USE_MOCKS
    ? mockReviews
    : await Review.find().select("status stats createdAt").lean();
  const queue = await reviewQueueCounts();
  res.json({ ...fromRows(reviews), queue });
}
