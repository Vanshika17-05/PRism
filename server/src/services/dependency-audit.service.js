import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

const run = promisify(execFile);
const severity = { critical: "high", high: "high", moderate: "medium", low: "low", info: "low" };

export function npmAuditToFindings(payload) {
  return Object.entries(payload.vulnerabilities || {}).map(([name, item]) => ({
    file: "package.json", line: 1, severity: severity[item.severity] || "medium", category: "dependency-vulnerability", source: "audit",
    title: `Vulnerable dependency: ${name}`, body: `${item.via?.map?.((via) => typeof via === "string" ? via : via.title).filter(Boolean).join("; ") || "Known vulnerability"}. Affected range: ${item.range || "unknown"}.`,
    suggestion: item.fixAvailable ? `Upgrade ${name} to a non-vulnerable version.` : "Review the advisory and replace or remove this dependency.", confidence: 100, posted: false
  }));
}

export async function auditDependencyFiles(files) {
  const pythonFiles = files.filter((file) => /(^|\/)(requirements[^/]*\.txt)$/i.test(file.path));
  const pythonPromise = pythonFiles.length ? fetch(`${env.PYTHON_SERVICE_URL}/dependency-audit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ files: pythonFiles.map((file) => ({ ...file, language: "python" })) }) }).then((response) => response.ok ? response.json() : { findings: [] }).then((payload) => payload.findings || []).catch((error) => { logger.warn({ err: error }, "Python dependency audit unavailable"); return []; }) : Promise.resolve([]);
  if (!files.some((file) => file.path === "package-lock.json")) return pythonPromise;
  const directory = await mkdtemp(path.join(os.tmpdir(), "prism-audit-"));
  try {
    await Promise.all(files.filter((file) => ["package.json", "package-lock.json"].includes(file.path)).map((file) => writeFile(path.join(directory, path.basename(file.path)), file.content, { encoding: "utf8", flag: "wx" })));
    let stdout = "";
    try { ({ stdout } = await run(process.platform === "win32" ? "npm.cmd" : "npm", ["audit", "--json", "--ignore-scripts"], { cwd: directory, timeout: 60_000, maxBuffer: 10 * 1024 * 1024, windowsHide: true })); }
    catch (error) { stdout = error.stdout || ""; if (!stdout) throw error; }
    return [...npmAuditToFindings(JSON.parse(stdout)), ...await pythonPromise];
  } catch (error) {
    logger.warn({ err: error }, "Dependency audit unavailable"); return [];
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
