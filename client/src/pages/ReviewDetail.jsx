import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Clipboard,
  ExternalLink,
  GitPullRequest,
  History,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { ScrollProgressBar } from "@/components/effects/ScrollProgressBar";
import { ShimmerSkeleton } from "@/components/effects/ShimmerSkeleton";
import { SpotlightCard } from "@/components/effects/SpotlightCard";
import { useReview } from "@/hooks/useReview";
import { useReviewProgress } from "@/hooks/useReviewProgress";
import { api } from "@/lib/api";
import { MorphingTabs } from "@/components/effects/MorphingTabs";

function Suggestion({ text }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="relative mt-4">
      <pre className="overflow-auto rounded-[18px] bg-[#16100C] p-4 pr-12 text-xs text-[#F0B48F]">
        <code>{text}</code>
      </pre>
      <button
        className="absolute right-2 top-2 grid size-8 place-items-center rounded-xl bg-white/10 text-white"
        onClick={copy}
        aria-label="Copy suggestion"
      >
        {copied ? <Check size={15} /> : <Clipboard size={15} />}
      </button>
    </div>
  );
}

function FixAgent({ reviewId, finding }) {
  const [result, setResult] = useState(null);
  const suggest = useMutation({
    mutationFn: async () =>
      (
        await api.post(
          `/api/reviews/${reviewId}/findings/${finding._id}/suggest-fix`,
        )
      ).data,
    onSuccess: setResult,
    onError: (error) => toast.error(error.message),
  });
  const apply = useMutation({
    mutationFn: () =>
      api.post(
        `/api/reviews/${reviewId}/findings/${finding._id}/apply-suggestion`,
        {
          suggestion: result.suggestion,
        },
      ),
    onSuccess: () => toast.success("Suggestion comment posted to GitHub"),
    onError: (error) => toast.error(error.message),
  });
  return (
    <div className="mt-4">
      <button
        className="clay-control px-4 py-2 text-xs font-bold"
        disabled={suggest.isPending}
        onClick={() => suggest.mutate()}
      >
        {suggest.isPending ? "Fetching, proposing, validating…" : "Suggest fix"}
      </button>
      {result && (
        <div className="mt-3 rounded-[18px] border border-border bg-surface-clay p-4">
          <p className="text-xs font-bold text-accent-dark">
            Agent completed: {result.steps.join(" → ")}
          </p>
          <Suggestion text={result.patch} />
          <button
            className="clay-button mt-3 px-4 py-2 text-xs font-bold"
            disabled={apply.isPending}
            onClick={() => apply.mutate()}
          >
            Apply as suggestion comment
          </button>
        </div>
      )}
    </div>
  );
}

export default function ReviewDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const query = useReview(id);
  const progress = useReviewProgress([query.data?.repository?._id]);
  const [open, setOpen] = useState({});
  const [dismissTarget, setDismissTarget] = useState(null);
  const [reason, setReason] = useState("");
  const [source, setSource] = useState("all");
  const mutation = useMutation({
    mutationFn: ({ findingId, dismissed, reason: why = "" }) =>
      api.patch(`/api/reviews/${id}/findings/${findingId}/dismiss`, {
        dismissed,
        reason: why,
      }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ["review", id] });
      const previous = queryClient.getQueryData(["review", id]);
      queryClient.setQueryData(["review", id], (old) => ({
        ...old,
        findings: old.findings.map((finding) =>
          finding._id === vars.findingId
            ? {
                ...finding,
                dismissed: vars.dismissed,
                dismissalReason: vars.reason,
              }
            : finding,
        ),
      }));
      return { previous };
    },
    onError: (_error, _variables, context) =>
      queryClient.setQueryData(["review", id], context.previous),
  });
  const groups = useMemo(
    () =>
      Object.entries(
        (query.data?.findings || [])
          .filter((finding) => source === "all" || finding.source === source)
          .reduce(
            (out, finding) => ({
              ...out,
              [finding.file]: [...(out[finding.file] || []), finding],
            }),
            {},
          ),
      ),
    [query.data, source],
  );
  if (query.isLoading)
    return (
      <div className="space-y-5">
        <ShimmerSkeleton className="h-44" />
        <ShimmerSkeleton className="h-72" />
      </div>
    );
  if (query.error)
    return (
      <div className="clay-card p-10 text-center">
        <RefreshCw className="mx-auto text-accent" />
        <h1 className="mt-4 font-bold">Review could not load</h1>
        <p className="mt-2 text-sm text-muted">{query.error.message}</p>
      </div>
    );
  const review = query.data;
  const liveProgress = progress[id];
  function confirmDismiss(finding) {
    mutation.mutate({ findingId: finding._id, dismissed: true, reason });
    setDismissTarget(null);
    setReason("");
    toast.success(
      "Feedback learned. Similar false positives will be suppressed.",
    );
  }
  return (
    <div className="space-y-6">
      <ScrollProgressBar />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-accent-dark">
            {review.repository?.fullName} · #{review.prNumber}
          </p>
          <h1 className="mt-2 max-w-4xl text-3xl font-black tracking-tight">
            {review.prTitle}
          </h1>
          <p className="mt-2 text-sm text-muted">Opened by {review.prAuthor}</p>
        </div>
        <a
          className="clay-control inline-flex items-center gap-2 px-4 py-2 text-sm font-bold"
          href={review.prUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open on GitHub <ExternalLink size={15} />
        </a>
      </div>
      <SpotlightCard className="p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="clay-icon text-accent">
            <Sparkles size={19} />
          </span>
          <h2 className="text-xl font-black">AI review summary</h2>
          <span className="clay-badge ml-auto uppercase">
            {review.overallRating?.replace("_", " ")}
          </span>
        </div>
        <p className="mt-5 max-w-4xl leading-7 text-muted">{review.summary}</p>
        {review.status === "processing" && (
          <div className="mt-5 rounded-[18px] border border-border bg-surface-alt p-4 text-sm font-bold text-accent-dark">
            {liveProgress?.currentFile
              ? `Analyzing file ${liveProgress.current} of ${liveProgress.total}: ${liveProgress.currentFile}…`
              : "Review started; preparing changed files…"}
          </div>
        )}
        {review.stats?.suppressedCount > 0 && (
          <div className="mt-5 flex items-center gap-2 rounded-[18px] border border-border bg-surface-alt p-4 text-sm font-bold">
            <ShieldCheck className="text-accent" size={18} />
            {review.stats.suppressedCount} findings auto-suppressed based on
            past feedback
          </div>
        )}
      </SpotlightCard>
      <div className="flex justify-end">
        <MorphingTabs
          items={[
            { value: "all", label: "All" },
            { value: "ai", label: "AI only" },
            { value: "lint", label: "Static analysis" },
            { value: "audit", label: "Dependency audit" },
          ]}
          value={source}
          onChange={setSource}
          layoutId="finding-source"
        />
      </div>
      <div className="space-y-4">
        {groups.map(([file, findings]) => {
          const complexity = review.fileComplexity?.find(
            (item) => item.path === file,
          );
          const active = open[file] !== false;
          return (
            <div className="clay-card overflow-hidden" key={file}>
              <button
                className="flex w-full items-center gap-3 p-5 text-left"
                onClick={() =>
                  setOpen((value) => ({ ...value, [file]: !active }))
                }
              >
                <GitPullRequest size={18} className="text-accent" />
                <span className="min-w-0 flex-1 truncate font-mono text-sm font-bold">
                  {file}
                </span>
                {complexity && (
                  <span className="clay-badge hidden sm:inline">
                    Complexity {complexity.complexityScore} · MI{" "}
                    {complexity.maintainabilityIndex ?? "—"}
                  </span>
                )}
                <motion.span animate={{ rotate: active ? 180 : 0 }}>
                  <ChevronDown />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {active && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border"
                  >
                    {findings.map((finding) => (
                      <div
                        key={finding._id}
                        className={`p-5 sm:p-6 ${finding.dismissed ? "opacity-50" : ""}`}
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`size-3 rounded-full severity-${finding.severity}`}
                            style={
                              finding.severity === "high"
                                ? { animation: "pulse-soft 1.8s infinite" }
                                : {}
                            }
                          />
                          <span className="clay-badge text-[10px] uppercase">
                            {finding.source === "lint"
                              ? "Static analysis"
                              : finding.source === "audit"
                                ? "Dependency audit"
                                : "AI"}
                          </span>
                          <span className="text-xs font-black uppercase text-muted">
                            {finding.severity} · {finding.category}
                          </span>
                          <span className="font-mono text-xs text-muted">
                            line {finding.line}
                          </span>
                          {finding.similarToReviewId && (
                            <a
                              href={`/dashboard/reviews/${finding.similarToReviewId}`}
                              className="clay-badge inline-flex items-center gap-1"
                            >
                              <History size={12} /> Similar past finding{" "}
                              {Math.round((finding.similarity || 0) * 100)}%
                            </a>
                          )}
                        </div>
                        <h3 className="mt-4 font-extrabold">{finding.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          {finding.body}
                        </p>
                        <div className="mt-4">
                          <div className="flex justify-between text-xs text-muted">
                            <span>Confidence</span>
                            <span>{finding.confidence || 0}%</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-alt">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${finding.confidence || 0}%` }}
                              className="h-full rounded-full bg-accent"
                            />
                          </div>
                        </div>
                        {finding.suggestion && (
                          <Suggestion text={finding.suggestion} />
                        )}
                        {finding.source === "ai" && (
                          <FixAgent reviewId={id} finding={finding} />
                        )}
                        {finding.source !== "ai" ? (
                          <p className="mt-4 text-xs font-semibold text-muted">
                            Deterministic findings cannot be suppressed; fix the
                            reported issue in code.
                          </p>
                        ) : dismissTarget === finding._id ? (
                          <div className="mt-5 rounded-[18px] border border-border bg-surface-clay p-4">
                            <label className="text-sm font-bold">
                              Why is this not an issue?
                              <textarea
                                className="clay-input mt-2 min-h-24 resize-y"
                                value={reason}
                                onChange={(event) =>
                                  setReason(event.target.value)
                                }
                                placeholder="Optional context that will help suppress similar false positives"
                              />
                            </label>
                            <div className="mt-3 flex gap-3">
                              <button
                                className="clay-button px-4 py-2 text-xs font-bold"
                                onClick={() => confirmDismiss(finding)}
                              >
                                Dismiss and teach PRism
                              </button>
                              <button
                                className="text-xs font-bold text-muted"
                                onClick={() => {
                                  setDismissTarget(null);
                                  setReason("");
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="mt-4 text-xs font-bold text-muted underline decoration-accent underline-offset-4"
                            onClick={() =>
                              finding.dismissed
                                ? mutation.mutate({
                                    findingId: finding._id,
                                    dismissed: false,
                                  })
                                : setDismissTarget(finding._id)
                            }
                          >
                            {finding.dismissed
                              ? "Restore finding"
                              : "Dismiss as false positive"}
                          </button>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
