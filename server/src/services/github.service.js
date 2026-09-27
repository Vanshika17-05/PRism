import { App } from "octokit";
import { env } from "../config/env.js";
import { githubBucket } from "./rate-limit.service.js";

let app;

function githubApp() {
  if (env.USE_MOCKS)
    throw new Error("GitHub API is unavailable while USE_MOCKS=true");
  app ||= new App({
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY,
  });
  return app;
}

export function getInstallationOctokit(installationId) {
  return githubApp().getInstallationOctokit(installationId);
}

export async function listPullRequestFiles(octokit, owner, repo, prNumber) {
  await githubBucket.acquire();
  return octokit.paginate(octokit.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });
}

export async function loadFileContents(octokit, owner, repo, ref, files) {
  return Promise.all(
    files
      .filter((file) => /\.(py|js|jsx|ts|tsx)$/i.test(file.filename))
      .map(async (file) => {
        try {
          await githubBucket.acquire();
          const response = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: file.filename,
            ref,
          });
          if (
            Array.isArray(response.data) ||
            response.data.type !== "file" ||
            !response.data.content
          )
            return null;
          const extension = file.filename.split(".").pop().toLowerCase();
          return {
            path: file.filename,
            content: Buffer.from(response.data.content, "base64").toString(
              "utf8",
            ),
            language: extension === "py" ? "python" : extension,
          };
        } catch {
          return null;
        }
      }),
  ).then((items) => items.filter(Boolean));
}

export async function loadFileContent(octokit, owner, repo, ref, filename) {
  const [file] = await loadFileContents(octokit, owner, repo, ref, [
    { filename },
  ]);
  if (!file)
    throw Object.assign(
      new Error("Current file could not be loaded from GitHub"),
      { status: 404 },
    );
  return file.content;
}

export async function postSuggestionComment(
  octokit,
  { owner, repo, prNumber, headSha, file, line, suggestion },
) {
  await githubBucket.acquire();
  return octokit.rest.pulls.createReviewComment({
    owner,
    repo,
    pull_number: prNumber,
    commit_id: headSha,
    path: file,
    line,
    side: "RIGHT",
    body: `PRism fix agent validated this change against the current file:\n\n\`\`\`suggestion\n${suggestion}\n\`\`\``,
  });
}

export async function loadDependencyManifests(
  octokit,
  owner,
  repo,
  ref,
  remoteFiles,
) {
  const changed = new Set(remoteFiles.map((file) => file.filename));
  const targets = new Set();
  if (changed.has("package.json") || changed.has("package-lock.json")) {
    targets.add("package.json");
    targets.add("package-lock.json");
  }
  for (const filename of changed)
    if (
      /(^|\/)(requirements[^/]*\.txt|pyproject\.toml|poetry\.lock)$/i.test(
        filename,
      )
    )
      targets.add(filename);
  return Promise.all(
    [...targets].map(async (filename) => {
      try {
        await githubBucket.acquire();
        const response = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: filename,
          ref,
        });
        if (
          Array.isArray(response.data) ||
          response.data.type !== "file" ||
          !response.data.content
        )
          return null;
        return {
          path: filename,
          content: Buffer.from(response.data.content, "base64").toString(
            "utf8",
          ),
        };
      } catch {
        return null;
      }
    }),
  ).then((items) => items.filter(Boolean));
}

function inlineBody(finding) {
  const suggestion = finding.suggestion
    ? `\n\n\`\`\`suggestion\n${finding.suggestion}\n\`\`\``
    : "";
  return `**${finding.severity.toUpperCase()} · ${finding.category} — ${finding.title}**\n\n${finding.body}${suggestion}`;
}

export async function postReview(
  octokit,
  { owner, repo, prNumber, headSha, body, event, findings },
) {
  const comments = findings.map((finding) => ({
    path: finding.file,
    line: finding.line,
    side: "RIGHT",
    body: inlineBody(finding),
  }));
  try {
    await githubBucket.acquire();
    return await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      commit_id: headSha,
      body,
      event,
      comments,
    });
  } catch (error) {
    if (error.status !== 422 || !comments.length) throw error;
    const folded = findings
      .map(
        (finding) =>
          `- **${finding.severity.toUpperCase()} · ${finding.file}:${finding.line} — ${finding.title}**\n  ${finding.body}`,
      )
      .join("\n");
    await githubBucket.acquire();
    return octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      commit_id: headSha,
      event: "COMMENT",
      body: `${body}\n\n### Inline comments GitHub could not place\n${folded}`,
    });
  }
}
