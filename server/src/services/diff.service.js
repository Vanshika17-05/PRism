import path from "node:path";

const ignoredNames = new Set(["package-lock.json", "yarn.lock", "pnpm-lock.yaml"]);
const binaryExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".woff", ".woff2", ".ttf", ".mp4", ".mov"]);
const blockedSegments = /(^|\/)(node_modules|dist|build|coverage|vendor)(\/|$)/i;

export function parseValidNewLines(patch = "") {
  const validLines = new Set();
  let newLine = 0;
  for (const line of patch.split("\n")) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk) { newLine = Number(hunk[1]); continue; }
    if (!newLine || line.startsWith("\\ No newline")) continue;
    if (line.startsWith("-")) continue;
    if (line.startsWith("+")) validLines.add(newLine);
    newLine += 1;
  }
  return validLines;
}

function matchesIgnoredPath(filename, patterns = []) {
  return patterns.some((pattern) => {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replaceAll("**", ".*").replaceAll("*", "[^/]*");
    return new RegExp(`^${escaped}$`).test(filename);
  });
}

export function buildReviewableFiles(files, settings = {}) {
  const limit = settings.maxFilesPerReview || 20;
  const reviewable = [];
  const skipped = [];
  for (const file of files) {
    const filename = file.filename || "";
    const changedLines = Number(file.changes || file.additions + file.deletions || 0);
    const shouldSkip = !file.patch || ignoredNames.has(path.basename(filename)) || blockedSegments.test(filename) || binaryExtensions.has(path.extname(filename).toLowerCase()) || /\.min\.(js|css)$/i.test(filename) || changedLines > 1500 || matchesIgnoredPath(filename, settings.ignoredPaths);
    if (shouldSkip || reviewable.length >= limit) { skipped.push(filename); continue; }
    const validLines = parseValidNewLines(file.patch);
    if (!validLines.size) { skipped.push(filename); continue; }
    reviewable.push({ filename, patch: file.patch, additions: file.additions || 0, deletions: file.deletions || 0, validLines });
  }
  return { reviewable, skipped };
}

export function validateFindings(findings, files) {
  const map = new Map(files.map((file) => [file.filename, file.validLines]));
  return findings.filter((finding) => map.get(finding.file)?.has(Number(finding.line)));
}
