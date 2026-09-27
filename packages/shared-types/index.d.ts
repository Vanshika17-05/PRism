export type ReviewStatus = "pending" | "processing" | "completed" | "failed" | "skipped";
export type FindingSource = "ai" | "lint" | "audit";
export type Severity = "low" | "medium" | "high";

export interface Finding {
  _id: string;
  file: string;
  line: number;
  severity: Severity;
  source: FindingSource;
  category: string;
  title: string;
  body: string;
  suggestion?: string;
  confidence: number;
  dismissed?: boolean;
}

export interface RepositorySettings {
  ignoredPaths: string[];
  maxFilesPerReview: number;
  severityThreshold: Severity;
  persona: "strict" | "balanced" | "friendly";
  aiProvider: "openai" | "gemini" | "claude";
  customRules: string[];
}

export interface Repository {
  _id: string;
  fullName: string;
  owner: string;
  name: string;
  isActive: boolean;
  settings: RepositorySettings;
}

export interface Review {
  _id: string;
  repository: Repository;
  prNumber: number;
  prTitle: string;
  prUrl: string;
  prAuthor: string;
  status: ReviewStatus;
  summary: string;
  findings: Finding[];
  stats: { filesReviewed: number; findingsCount: number; suppressedCount: number; durationMs: number };
}

export interface ApiEnvelope<T> { data?: T; error?: string }
export interface PaginatedResponse<T> { items: T[]; pagination: { page: number; pages: number; total: number; limit: number } }
