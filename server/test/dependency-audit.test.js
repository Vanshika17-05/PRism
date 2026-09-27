import assert from "node:assert/strict";
import test from "node:test";
import { npmAuditToFindings } from "../src/services/dependency-audit.service.js";

test("npm audit advisories become deterministic security findings", () => {
  const findings = npmAuditToFindings({ vulnerabilities: { example: { severity: "critical", range: "<2.0.0", via: [{ title: "Prototype pollution" }], fixAvailable: true } } });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].source, "audit");
  assert.equal(findings[0].category, "dependency-vulnerability");
  assert.equal(findings[0].severity, "high");
});
