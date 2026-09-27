const daysAgo = (days, hour = 10) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

export const mockRepositories = [
  {
    _id: "66f000000000000000000001",
    githubRepoId: 918273645,
    fullName: "prism-labs/web-platform",
    owner: "prism-labs",
    name: "web-platform",
    installationId: 10101,
    isActive: true,
    settings: {
      ignoredPaths: ["dist/**", "*.lock"],
      maxFilesPerReview: 20,
      severityThreshold: "low",
      persona: "balanced",
      customRules: [],
      monthlyTokenBudget: 500000,
      tokensUsedThisMonth: 128400,
      budgetMonth: new Date().toISOString().slice(0, 7),
    },
    createdAt: daysAgo(52),
  },
  {
    _id: "66f000000000000000000000002",
    githubRepoId: 918273646,
    fullName: "prism-labs/api-gateway",
    owner: "prism-labs",
    name: "api-gateway",
    installationId: 10101,
    isActive: true,
    settings: {
      ignoredPaths: ["vendor/**"],
      maxFilesPerReview: 30,
      severityThreshold: "medium",
      persona: "strict",
      customRules: ["Flag endpoints that do not enforce authorization."],
      monthlyTokenBudget: 500000,
      tokensUsedThisMonth: 342100,
      budgetMonth: new Date().toISOString().slice(0, 7),
    },
    createdAt: daysAgo(38),
  },
  {
    _id: "66f000000000000000000000003",
    githubRepoId: 918273647,
    fullName: "prism-labs/mobile-app",
    owner: "prism-labs",
    name: "mobile-app",
    installationId: 10101,
    isActive: false,
    settings: {
      ignoredPaths: [],
      maxFilesPerReview: 20,
      severityThreshold: "low",
      persona: "friendly",
      customRules: [],
      monthlyTokenBudget: 500000,
      tokensUsedThisMonth: 0,
      budgetMonth: new Date().toISOString().slice(0, 7),
    },
    createdAt: daysAgo(24),
  },
];

export const mockSuppressions = [
  {
    id: "mock-suppression-auth",
    repoId: "66f000000000000000000000002",
    reviewId: "77f000000000000000000000003",
    findingId: "historical-auth",
    file: "src/middleware/auth.js",
    text: "Missing audience validation in an internal-only test token path.",
    reason:
      "This path only accepts fixtures generated inside the isolated test runner.",
    type: "known_non_issue",
  },
];

export const mockFailedReviews = [];

const findings = {
  auth: {
    _id: "finding-auth",
    file: "src/middleware/auth.js",
    line: 42,
    severity: "high",
    source: "ai",
    category: "security",
    title: "Authorization check can be bypassed",
    body: "The fallback path accepts a decoded token without checking its audience.",
    suggestion:
      "if (payload.aud !== env.AUTH_AUDIENCE) throw new UnauthorizedError();",
    confidence: 96,
    posted: true,
  },
  lint: {
    _id: "finding-lint",
    file: "src/middleware/auth.js",
    line: 51,
    severity: "high",
    source: "lint",
    category: "maintainability",
    title: "Static analysis: no-undef",
    body: "'sessionAudience' is not defined.",
    suggestion: "",
    confidence: 100,
    posted: true,
  },
  query: {
    _id: "finding-query",
    file: "src/services/search.js",
    line: 87,
    severity: "medium",
    source: "ai",
    category: "performance",
    title: "Repeated query inside result loop",
    body: "Fetching metadata once per result creates avoidable database round trips.",
    suggestion:
      "const metadata = await Metadata.find({ id: { $in: resultIds } });",
    confidence: 91,
    posted: true,
  },
  error: {
    _id: "finding-error",
    file: "src/routes/checkout.js",
    line: 118,
    severity: "medium",
    source: "ai",
    category: "bug",
    title: "Failed payment leaves order pending",
    body: "The error branch returns before the order state is updated.",
    suggestion: "await order.markPaymentFailed(error.code);",
    confidence: 88,
    posted: true,
  },
  naming: {
    _id: "finding-naming",
    file: "src/components/FilterBar.jsx",
    line: 31,
    severity: "low",
    source: "ai",
    category: "maintainability",
    title: "Extract repeated filter mapping",
    body: "The same label mapping is duplicated in two render paths.",
    suggestion: "const filterLabel = FILTER_LABELS[filter] ?? filter;",
    confidence: 79,
    posted: true,
  },
};

const repo = (index) => ({
  _id: mockRepositories[index]._id,
  fullName: mockRepositories[index].fullName,
});
export const mockReviews = [
  {
    _id: "77f000000000000000000001",
    repository: repo(1),
    prNumber: 184,
    prTitle: "Harden session validation for service tokens",
    prUrl: "https://github.com/prism-labs/api-gateway/pull/184",
    prAuthor: "maya-chen",
    headSha: "8c64df1",
    deliveryId: "mock-001",
    status: "completed",
    summary:
      "The authentication changes are well scoped, but the service-token fallback needs an audience check before merge.",
    overallRating: "request_changes",
    findings: [
      {
        ...findings.auth,
        similarToReviewId: "77f000000000000000000000003",
        similarity: 0.87,
      },
      findings.lint,
      findings.naming,
    ],
    fileComplexity: [
      {
        path: "src/middleware/auth.js",
        complexityScore: 7.2,
        maintainabilityIndex: 76.4,
        linesOfCode: 118,
        commentRatio: 0.12,
      },
      {
        path: "src/components/FilterBar.jsx",
        complexityScore: 3.5,
        maintainabilityIndex: null,
        linesOfCode: 86,
        commentRatio: 0.08,
      },
    ],
    stats: {
      filesReviewed: 8,
      findingsCount: 3,
      suppressedCount: 1,
      durationMs: 18400,
    },
    createdAt: daysAgo(0, 9),
  },
  {
    _id: "77f000000000000000000000002",
    repository: repo(0),
    prNumber: 427,
    prTitle: "Add saved views to the analytics dashboard",
    prUrl: "https://github.com/prism-labs/web-platform/pull/427",
    prAuthor: "jon-bell",
    headSha: "2f901ad",
    deliveryId: "mock-002",
    status: "completed",
    summary:
      "The saved-view flow is clear and well tested. Consider batching metadata reads before shipping.",
    overallRating: "comment",
    findings: [findings.query],
    stats: { filesReviewed: 12, findingsCount: 1, durationMs: 12600 },
    createdAt: daysAgo(1, 14),
  },
  {
    _id: "77f000000000000000000000003",
    repository: repo(0),
    prNumber: 421,
    prTitle: "Improve checkout retry handling",
    prUrl: "https://github.com/prism-labs/web-platform/pull/421",
    prAuthor: "alex-rivera",
    headSha: "ba22391",
    deliveryId: "mock-003",
    status: "completed",
    summary:
      "Retry behavior is safer overall. One failure path should update the order before returning.",
    overallRating: "request_changes",
    findings: [findings.error],
    stats: { filesReviewed: 6, findingsCount: 1, durationMs: 9800 },
    createdAt: daysAgo(3, 11),
  },
  {
    _id: "77f000000000000000000000004",
    repository: repo(1),
    prNumber: 179,
    prTitle: "Stream audit events to the warehouse",
    prUrl: "https://github.com/prism-labs/api-gateway/pull/179",
    prAuthor: "sam-kim",
    headSha: "de8312a",
    deliveryId: "mock-004",
    status: "completed",
    summary:
      "Clean event boundary and sensible retry policy. No actionable issues found.",
    overallRating: "approve",
    findings: [],
    stats: { filesReviewed: 9, findingsCount: 0, durationMs: 11200 },
    createdAt: daysAgo(5, 15),
  },
  {
    _id: "77f000000000000000000000005",
    repository: repo(0),
    prNumber: 415,
    prTitle: "Refactor feature flag evaluation",
    prUrl: "https://github.com/prism-labs/web-platform/pull/415",
    prAuthor: "maya-chen",
    headSha: "1ca7be0",
    deliveryId: "mock-005",
    status: "completed",
    summary: "The refactor reduces branching and preserves existing behavior.",
    overallRating: "approve",
    findings: [],
    stats: { filesReviewed: 5, findingsCount: 0, durationMs: 7900 },
    createdAt: daysAgo(8, 10),
  },
];

export function mockStatsFor(repositoryId) {
  const repository = mockRepositories.find((item) => item._id === repositoryId);
  if (!repository) return null;
  const reviews = mockReviews.filter(
    (item) => item.repository._id === repositoryId,
  );
  const allFindings = reviews.flatMap((item) => item.findings);
  const group = (field) =>
    Object.entries(
      allFindings.reduce(
        (out, finding) => ({
          ...out,
          [finding[field]]: (out[finding[field]] || 0) + 1,
        }),
        {},
      ),
    ).map(([_id, count]) => ({ _id, count }));
  const timeline = Object.entries(
    reviews.reduce(
      (out, review) => ({
        ...out,
        [review.createdAt.slice(0, 10)]:
          (out[review.createdAt.slice(0, 10)] || 0) + 1,
      }),
      {},
    ),
  )
    .map(([_id, count]) => ({ _id, count }))
    .sort((a, b) => a._id.localeCompare(b._id));
  const high = allFindings.filter(
    (item) => item.severity === "high" && !item.dismissed,
  ).length;
  const medium = allFindings.filter(
    (item) => item.severity === "medium" && !item.dismissed,
  ).length;
  const codeHealthScore = reviews.length
    ? Math.max(
        0,
        Math.round(
          100 -
            ((high * 8 +
              medium * 3 +
              Math.max(0, allFindings.length - high - medium)) /
              reviews.length) *
              2,
        ),
      )
    : 100;
  const contributors = new Map();
  reviews.forEach((review) => {
    const current = contributors.get(review.prAuthor) || {
      name: review.prAuthor,
      reviews: 0,
      high: 0,
    };
    current.reviews += 1;
    current.high += review.findings.filter(
      (item) => item.severity === "high" && !item.dismissed,
    ).length;
    contributors.set(review.prAuthor, current);
  });
  return {
    repository,
    summary: {
      totalReviews: reviews.length,
      completedReviews: reviews.filter((item) => item.status === "completed")
        .length,
      totalFindings: allFindings.length,
      averageDurationMs: reviews.length
        ? Math.round(
            reviews.reduce((sum, item) => sum + item.stats.durationMs, 0) /
              reviews.length,
          )
        : 0,
      codeHealthScore,
    },
    findingsBySeverity: group("severity"),
    findingsByCategory: group("category"),
    reviewsPerDay: timeline,
    contributorLeaderboard: [...contributors.values()].sort(
      (a, b) => a.high - b.high || b.reviews - a.reviews,
    ),
  };
}
