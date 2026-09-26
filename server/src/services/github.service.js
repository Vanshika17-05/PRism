import { App } from "octokit";
import { env } from "../config/env.js";

const app = new App({ appId: env.GITHUB_APP_ID, privateKey: env.GITHUB_APP_PRIVATE_KEY });

export function getInstallationOctokit(installationId) {
  return app.getInstallationOctokit(installationId);
}

export async function listPullRequestFiles(octokit, owner, repo, prNumber) {
  return octokit.paginate(octokit.rest.pulls.listFiles, { owner, repo, pull_number: prNumber, per_page: 100 });
}

function inlineBody(finding) {
  const suggestion = finding.suggestion ? `\n\n\`\`\`suggestion\n${finding.suggestion}\n\`\`\`` : "";
  return `**${finding.severity.toUpperCase()} · ${finding.category} — ${finding.title}**\n\n${finding.body}${suggestion}`;
}

export async function postReview(octokit, { owner, repo, prNumber, headSha, body, event, findings }) {
  const comments = findings.map((finding) => ({ path: finding.file, line: finding.line, side: "RIGHT", body: inlineBody(finding) }));
  try {
    return await octokit.rest.pulls.createReview({ owner, repo, pull_number: prNumber, commit_id: headSha, body, event, comments });
  } catch (error) {
    if (error.status !== 422 || !comments.length) throw error;
    const folded = findings.map((finding) => `- **${finding.severity.toUpperCase()} · ${finding.file}:${finding.line} — ${finding.title}**\n  ${finding.body}`).join("\n");
    return octokit.rest.pulls.createReview({ owner, repo, pull_number: prNumber, commit_id: headSha, event: "COMMENT", body: `${body}\n\n### Inline comments GitHub could not place\n${folded}` });
  }
}
