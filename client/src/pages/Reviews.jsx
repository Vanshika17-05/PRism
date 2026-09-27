import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, GitPullRequest, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MorphingTabs } from "@/components/effects/MorphingTabs";
import { ShimmerSkeleton } from "@/components/effects/ShimmerSkeleton";
import { MagneticButton } from "@/components/effects/MagneticButton";
import { useReviews } from "@/hooks/useReviews";
import { useRepos } from "@/hooks/useRepos";
import { useReviewProgress } from "@/hooks/useReviewProgress";
import { timeAgo } from "@/lib/format";

const statuses = ["all", "completed", "processing", "failed"].map((value) => ({
  value,
  label: value[0].toUpperCase() + value.slice(1),
}));
const ratingLabel = {
  approve: "Approved",
  comment: "Commented",
  request_changes: "Changes requested",
};
export default function Reviews() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("all");
  const [repo, setRepo] = useState("");
  const [severity, setSeverity] = useState("");
  const [page, setPage] = useState(1);
  const reviews = useReviews({
    page,
    ...(status !== "all" ? { status } : {}),
    ...(repo ? { repo } : {}),
  });
  const repos = useRepos();
  const progress = useReviewProgress(repos.data?.map((item) => item._id) || []);
  const items = useMemo(
    () =>
      severity
        ? (reviews.data?.items || []).filter((review) =>
            review.findings?.some((f) => f.severity === severity),
          )
        : reviews.data?.items || [],
    [reviews.data, severity],
  );
  if (reviews.isLoading || repos.isLoading)
    return (
      <div className="space-y-5">
        <ShimmerSkeleton className="h-24" />
        <ShimmerSkeleton className="h-96" />
      </div>
    );
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold text-accent-dark">REVIEW HISTORY</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">
          Pull request reviews
        </h1>
        <p className="mt-2 text-sm text-muted">
          Search, filter, and inspect every engineering signal.
        </p>
      </div>
      <div className="clay-card flex flex-col gap-4 p-4 xl:flex-row xl:items-center">
        <MorphingTabs
          items={statuses}
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          layoutId="review-status"
          className="overflow-x-auto"
        />
        <div className="ml-auto flex flex-col gap-3 sm:flex-row">
          <label className="relative">
            <span className="sr-only">Repository</span>
            <select
              className="clay-input min-w-52 appearance-none"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
            >
              <option value="">All repositories</option>
              {repos.data?.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.fullName}
                </option>
              ))}
            </select>
          </label>
          <select
            aria-label="Severity"
            className="clay-input min-w-40"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            <option value="">All severities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>
      {reviews.error ? (
        <div className="clay-card p-10 text-center">
          <RefreshCw className="mx-auto text-accent" />
          <h2 className="mt-4 font-bold">Reviews could not load</h2>
          <p className="mt-2 text-sm text-muted">{reviews.error.message}</p>
          <MagneticButton className="mt-5" onClick={() => reviews.refetch()}>
            Try again
          </MagneticButton>
        </div>
      ) : items.length ? (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.05 } } }}
          className="clay-card overflow-hidden"
        >
          <div className="hidden grid-cols-[1fr_180px_100px_120px_40px] gap-4 border-b border-border px-6 py-4 text-xs font-bold uppercase tracking-wide text-muted md:grid">
            <span>Pull request</span>
            <span>Repository</span>
            <span>Findings</span>
            <span>Status</span>
            <span />
          </div>
          {items.map((review) => (
            <motion.button
              variants={{
                hidden: { opacity: 0, y: 8 },
                show: { opacity: 1, y: 0 },
              }}
              key={review._id}
              onClick={() => navigate(`/dashboard/reviews/${review._id}`)}
              className="grid w-full gap-3 border-b border-border px-5 py-5 text-left transition hover:bg-accent/5 md:grid-cols-[1fr_180px_100px_120px_40px] md:items-center md:gap-4"
            >
              <div>
                <p className="font-bold">{review.prTitle}</p>
                <p className="mt-1 text-xs text-muted">
                  #{review.prNumber} by {review.prAuthor} ·{" "}
                  {timeAgo(review.createdAt)}
                </p>
              </div>
              <p className="truncate text-sm text-muted">
                {review.repository?.fullName}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="size-2 rounded-full bg-high" />
                {review.findings?.filter((f) => !f.dismissed).length || 0}
              </div>
              <span className="clay-badge w-fit text-[10px] uppercase">
                {review.status === "processing" &&
                progress[review._id]?.currentFile
                  ? `${progress[review._id].current}/${progress[review._id].total} ${progress[review._id].currentFile}`
                  : ratingLabel[review.overallRating] || review.status}
              </span>
              <ArrowRight size={16} className="hidden text-muted md:block" />
            </motion.button>
          ))}
        </motion.div>
      ) : (
        <div className="clay-card py-16 text-center">
          <GitPullRequest className="mx-auto text-accent" size={32} />
          <h2 className="mt-4 text-lg font-bold">
            No reviews match these filters
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Clear a filter or connect a repository to start building review
            history.
          </p>
          <MagneticButton
            className="mt-5"
            onClick={() => {
              setStatus("all");
              setRepo("");
              setSeverity("");
            }}
          >
            Clear filters
          </MagneticButton>
        </div>
      )}
      <div className="flex items-center justify-between">
        <button
          className="clay-control flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          <ArrowLeft size={15} /> Previous
        </button>
        <span className="text-sm text-muted">
          Page {reviews.data?.pagination.page || 1} of{" "}
          {reviews.data?.pagination.pages || 1}
        </span>
        <button
          className="clay-control flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-40"
          disabled={page >= (reviews.data?.pagination.pages || 1)}
          onClick={() => setPage((p) => p + 1)}
        >
          Next <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
