import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { env } from "../config/env.js";

let database;
function db() {
  if (database) return database;
  fs.mkdirSync(path.dirname(env.ANALYTICS_DB_PATH), { recursive: true });
  database = new Database(env.ANALYTICS_DB_PATH);
  database.pragma("journal_mode = WAL");
  database.exec(`CREATE TABLE IF NOT EXISTS review_analytics (
    review_id TEXT PRIMARY KEY,
    repo_id TEXT NOT NULL,
    review_date TEXT NOT NULL,
    findings_count INTEGER NOT NULL,
    high_count INTEGER NOT NULL,
    medium_count INTEGER NOT NULL,
    low_count INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL
  ); CREATE INDEX IF NOT EXISTS idx_review_analytics_repo_date ON review_analytics(repo_id, review_date);`);
  return database;
}

export function recordReviewAnalytics(review) {
  const counts = { high: 0, medium: 0, low: 0 };
  for (const finding of review.findings || []) counts[finding.severity] += 1;
  db()
    .prepare(
      `INSERT INTO review_analytics
    (review_id, repo_id, review_date, findings_count, high_count, medium_count, low_count, duration_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(review_id) DO UPDATE SET findings_count=excluded.findings_count,
      high_count=excluded.high_count, medium_count=excluded.medium_count,
      low_count=excluded.low_count, duration_ms=excluded.duration_ms`,
    )
    .run(
      String(review.id || review._id),
      String(review.repository),
      new Date(review.createdAt || Date.now()).toISOString(),
      review.stats?.findingsCount || 0,
      counts.high,
      counts.medium,
      counts.low,
      review.stats?.durationMs || 0,
    );
}

export function queryReviewAnalytics(repoId, from, to) {
  return db()
    .prepare(
      `SELECT substr(review_date, 1, 10) AS date,
      COUNT(*) AS reviews, SUM(findings_count) AS findingsCount,
      SUM(high_count) AS high, SUM(medium_count) AS medium, SUM(low_count) AS low,
      ROUND(AVG(duration_ms)) AS avgDuration
    FROM review_analytics WHERE repo_id = ? AND review_date BETWEEN ? AND ?
    GROUP BY substr(review_date, 1, 10) ORDER BY date`,
    )
    .all(String(repoId), from, to);
}
