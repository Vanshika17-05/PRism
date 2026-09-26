import assert from "node:assert/strict";
import test from "node:test";
import { buildReviewableFiles, parseValidNewLines, validateFindings } from "../src/services/diff.service.js";

test("parseValidNewLines returns only added lines", () => {
  const lines = parseValidNewLines("@@ -8,2 +8,3 @@\n old\n-removed\n+added\n+second");
  assert.deepEqual([...lines], [9, 10]);
});

test("buildReviewableFiles filters lockfiles and invalid findings", () => {
  const { reviewable, skipped } = buildReviewableFiles([{ filename: "src/a.js", patch: "@@ -0,0 +1 @@\n+ok", changes: 1 }, { filename: "package-lock.json", patch: "@@ -0,0 +1 @@\n+no", changes: 1 }]);
  assert.equal(reviewable.length, 1); assert.deepEqual(skipped, ["package-lock.json"]);
  assert.equal(validateFindings([{ file: "src/a.js", line: 1 }, { file: "src/a.js", line: 99 }], reviewable).length, 1);
});
