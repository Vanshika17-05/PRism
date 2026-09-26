import assert from "node:assert/strict";
import test from "node:test";
import { lintFiles, lintResultsToFindings } from "../src/services/lint.service.js";

test("ESLint returns deterministic JS findings with lint source", async () => {
  const results = await lintFiles([{ path: "src/example.js", language: "js", content: "export const value = missingValue;\n" }]);
  const findings = lintResultsToFindings(results);
  assert.ok(findings.some((finding) => finding.source === "lint" && finding.title.includes("no-undef") && finding.line === 1));
  assert.ok(findings.every((finding) => finding.confidence === 100));
});
