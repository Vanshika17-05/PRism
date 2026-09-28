import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowRight,
  Clock3,
  Code2,
  GitPullRequest,
  Github,
  ShieldCheck,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GradientMeshBackground } from "@/components/effects/GradientMeshBackground";
import { SpotlightCard } from "@/components/effects/SpotlightCard";
import { AnimatedCounter } from "@/components/effects/AnimatedCounter";
import { ShimmerSkeleton } from "@/components/effects/ShimmerSkeleton";
import { MagneticButton } from "@/components/effects/MagneticButton";
import { useRepos } from "@/hooks/useRepos";
import { useReviews } from "@/hooks/useReviews";
import { useStats } from "@/hooks/useStats";
import { api } from "@/lib/api";
import { useOrganization } from "@/context/OrganizationContext";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const reveal = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const chartColors = [
  "var(--accent)",
  "var(--severity-med)",
  "var(--severity-high)",
  "var(--severity-low)",
  "var(--accent-dark)",
];

function mergeMetrics(repos, stats, reviews) {
  const ready = stats.filter((query) => query.data).map((query) => query.data);
  const summary = ready.reduce(
    (out, item) => ({
      totalReviews: out.totalReviews + item.summary.totalReviews,
      totalFindings: out.totalFindings + item.summary.totalFindings,
      duration:
        out.duration +
        item.summary.averageDurationMs * item.summary.totalReviews,
    }),
    { totalReviews: 0, totalFindings: 0, duration: 0 },
  );
  const group = (field, names) =>
    names.map((name) => ({
      name,
      value: ready.reduce(
        (sum, item) =>
          sum +
          ((item[field] || []).find((row) => row._id === name)?.count || 0),
        0,
      ),
    }));
  const days = new Map();
  ready
    .flatMap((item) => item.reviewsPerDay || [])
    .forEach((row) => days.set(row._id, (days.get(row._id) || 0) + row.count));
  const timeline = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      date: date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      reviews: days.get(key) || 0,
    };
  });
  const high = reviews.reduce(
    (sum, item) =>
      sum +
      (item.findings || []).filter((finding) => finding.severity === "high")
        .length,
    0,
  );
  const medium = reviews.reduce(
    (sum, item) =>
      sum +
      (item.findings || []).filter((finding) => finding.severity === "medium")
        .length,
    0,
  );
  const health = summary.totalReviews
    ? Math.max(
        0,
        Math.round(
          100 -
            ((high * 8 +
              medium * 3 +
              Math.max(0, summary.totalFindings - high - medium)) /
              summary.totalReviews) *
              2,
        ),
      )
    : 100;
  const people = new Map();
  reviews.forEach((review) => {
    const name = review.prAuthor || "Unknown";
    const current = people.get(name) || { name, reviews: 0, high: 0 };
    current.reviews += 1;
    current.high += (review.findings || []).filter(
      (finding) => finding.severity === "high",
    ).length;
    people.set(name, current);
  });
  return {
    totalReviews: summary.totalReviews,
    totalFindings: summary.totalFindings,
    avgDuration: summary.totalReviews
      ? summary.duration / summary.totalReviews / 1000
      : 0,
    activeRepos: repos.filter((repo) => repo.isActive).length,
    severity: group("findingsBySeverity", ["low", "medium", "high"]),
    categories: group("findingsByCategory", [
      "bug",
      "security",
      "performance",
      "style",
      "maintainability",
    ]),
    timeline,
    health,
    leaderboard: [...people.values()]
      .sort((a, b) => a.high - b.high || b.reviews - a.reviews)
      .slice(0, 5),
  };
}

function HealthRing({ score }) {
  const r = 43;
  const length = 2 * Math.PI * r;
  return (
    <div className="relative size-28">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <defs>
          <linearGradient id="health">
            <stop stopColor="var(--accent)" />
            <stop offset="1" stopColor="var(--accent-dark)" />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--surface-alt)"
          strokeWidth="8"
        />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="url(#health)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={length}
          initial={{ strokeDashoffset: length }}
          animate={{ strokeDashoffset: length * (1 - score / 100) }}
          transition={{ duration: 1.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-2xl font-extrabold">
        <AnimatedCounter value={score} />
      </div>
    </div>
  );
}
function EmptyChart({ message }) {
  return (
    <div className="flex h-[260px] items-center justify-center text-center text-sm text-muted">
      {message}
    </div>
  );
}
function TooltipBox({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-control border border-border bg-surface p-3 text-xs shadow-glass">
      <p className="font-semibold text-primary">{label || payload[0].name}</p>
      <p className="mt-1 text-muted">{payload[0].value}</p>
    </div>
  );
}

export default function Overview() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { current } = useOrganization();
  const repos = useRepos();
  const reviews = useReviews({ page: 1 });
  const stats = useStats(repos.data || []);
  const onboarding = useQuery({
    queryKey: ["onboarding", current?._id],
    enabled: Boolean(current?._id),
    queryFn: async () =>
      (await api.get(`/api/organizations/${current._id}/onboarding`)).data,
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      query.state.data?.hasCompletedOnboarding ? false : 30_000,
  });
  const system = useQuery({
    queryKey: ["metrics"],
    queryFn: async () => (await api.get("/api/metrics")).data,
    refetchInterval: 15_000,
  });
  const loading =
    repos.isLoading ||
    reviews.isLoading ||
    onboarding.isLoading ||
    stats.some((query) => query.isLoading);
  const error =
    repos.error ||
    reviews.error ||
    onboarding.error ||
    stats.find((query) => query.error)?.error;
  const reviewItems = reviews.data?.items || [];
  const metrics = useMemo(
    () => mergeMetrics(repos.data || [], stats, reviewItems),
    [repos.data, stats, reviewItems],
  );
  if (loading)
    return (
      <div className="space-y-5">
        <ShimmerSkeleton className="h-52" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <ShimmerSkeleton key={i} className="h-36" />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <ShimmerSkeleton className="h-80" />
          <ShimmerSkeleton className="h-80" />
        </div>
      </div>
    );
  if (error)
    return (
      <div className="clay-card mx-auto mt-20 max-w-xl p-8 text-center">
        <TriangleAlert className="mx-auto text-high" />
        <h1 className="mt-4 text-xl font-bold">
          The dashboard could not load.
        </h1>
        <p className="mt-2 text-sm text-muted">{error.message}</p>
        <MagneticButton
          className="mt-5"
          onClick={() => window.location.reload()}
        >
          Try again
        </MagneticButton>
      </div>
    );
  if (onboarding.data && !onboarding.data.hasCompletedOnboarding)
    return <OnboardingChecklist status={onboarding.data} />;
  const noData = metrics.totalReviews === 0;
  const cards = [
    {
      label: "Total reviews",
      value: metrics.totalReviews,
      icon: GitPullRequest,
    },
    { label: "Total findings", value: metrics.totalFindings, icon: Code2 },
    { label: "Active repos", value: metrics.activeRepos, icon: Github },
    {
      label: "Avg review time",
      value: metrics.avgDuration,
      decimals: 1,
      suffix: "s",
      icon: Clock3,
    },
  ];
  return (
    <div className="space-y-6">
      <section className="overview-hero clay-card relative overflow-hidden px-6 py-8 sm:px-8">
        <GradientMeshBackground />
        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="clay-badge inline-flex items-center gap-2 text-accent-dark">
              <Activity size={14} /> Engineering signal, without the noise
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-extrabold tracking-[-.045em] sm:text-5xl">
              See what changed. Understand what matters.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
              PRism turns pull request reviews into clear engineering signals
              while your source stays on infrastructure you control.
            </p>
          </div>
          {noData && (
            <MagneticButton onClick={() => navigate("/dashboard/repos")}>
              Connect a repository <ArrowRight size={16} />
            </MagneticButton>
          )}
        </div>
      </section>
      <SpotlightCard className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <span className="clay-icon text-accent">
              <Activity size={18} />
            </span>
            <div>
              <h2 className="font-bold">System health</h2>
              <p className="text-xs text-muted">
                Live review worker and queue signals
              </p>
            </div>
          </div>
          <div className="flex gap-8">
            <div>
              <p className="text-xs font-bold text-muted">QUEUE DEPTH</p>
              <p className="mt-1 text-2xl font-black">
                {system.data?.queue.depth ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-muted">ERROR RATE</p>
              <p className="mt-1 text-2xl font-black">
                {system.data ? `${system.data.errorRate}%` : "—"}
              </p>
            </div>
          </div>
        </div>
      </SpotlightCard>
      <motion.div
        variants={stagger}
        initial={reduce ? false : "hidden"}
        whileInView="show"
        viewport={{ once: true }}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
      >
        {cards.map(({ label, value, decimals, suffix, icon: Icon }) => (
          <motion.div key={label} variants={reveal}>
            <SpotlightCard className="h-full p-5">
              <span className="flex size-9 items-center justify-center rounded-control bg-surface-alt text-accent-dark">
                <Icon size={17} />
              </span>
              <div className="mt-5 text-3xl font-extrabold tracking-tight">
                <AnimatedCounter
                  value={value}
                  decimals={decimals}
                  suffix={suffix}
                />
              </div>
              <p className="mt-1 text-xs font-medium text-muted">{label}</p>
            </SpotlightCard>
          </motion.div>
        ))}
        <motion.div variants={reveal}>
          <SpotlightCard className="flex h-full items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs font-medium text-muted">
                Code health score
              </p>
              <p className="mt-2 text-sm font-semibold">
                {metrics.health >= 85
                  ? "Strong"
                  : metrics.health >= 65
                    ? "Watch closely"
                    : "Needs attention"}
              </p>
            </div>
            <HealthRing score={metrics.health} />
          </SpotlightCard>
        </motion.div>
      </motion.div>
      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <SpotlightCard className="p-5 sm:p-6">
          <div>
            <h2 className="font-bold">Review activity</h2>
            <p className="mt-1 text-xs text-muted">
              Last 14 days across connected repositories
            </p>
          </div>
          {noData ? (
            <EmptyChart message="Review activity will appear after PRism completes its first pull request review." />
          ) : (
            <div className="mt-5 h-[270px]">
              <ResponsiveContainer>
                <AreaChart data={metrics.timeline}>
                  <defs>
                    <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="var(--accent)"
                        stopOpacity=".35"
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--accent)"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  />
                  <Tooltip content={<TooltipBox />} />
                  <Area
                    type="monotone"
                    dataKey="reviews"
                    stroke="var(--accent-dark)"
                    strokeWidth={2.5}
                    fill="url(#areaFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </SpotlightCard>
        <SpotlightCard className="p-5 sm:p-6">
          <h2 className="font-bold">Findings by severity</h2>
          <p className="mt-1 text-xs text-muted">
            Distribution of actionable findings
          </p>
          {noData ? (
            <EmptyChart message="No findings recorded yet." />
          ) : (
            <div className="mt-3 h-[270px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={metrics.severity}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={4}
                  >
                    {metrics.severity.map((row, i) => (
                      <Cell
                        key={row.name}
                        fill={
                          [
                            "var(--severity-low)",
                            "var(--severity-med)",
                            "var(--severity-high)",
                          ][i]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<TooltipBox />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SpotlightCard>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <SpotlightCard className="p-5 sm:p-6">
          <h2 className="font-bold">Finding categories</h2>
          <p className="mt-1 text-xs text-muted">
            Where review attention is concentrated
          </p>
          {noData ? (
            <EmptyChart message="Category trends will build as reviews complete." />
          ) : (
            <div className="mt-5 h-[280px]">
              <ResponsiveContainer>
                <BarChart data={metrics.categories} layout="vertical">
                  <CartesianGrid stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  />
                  <Tooltip content={<TooltipBox />} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {metrics.categories.map((row, index) => (
                      <Cell key={row.name} fill={chartColors[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SpotlightCard>
        <SpotlightCard className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">Contributor leaderboard</h2>
              <p className="mt-1 text-xs text-muted">
                Fewest high-severity findings first
              </p>
            </div>
            <UsersRound size={18} className="text-accent" />
          </div>
          {metrics.leaderboard.length ? (
            <motion.ol
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="mt-5 space-y-2"
            >
              {metrics.leaderboard.map((person, index) => (
                <motion.li
                  variants={reveal}
                  key={person.name}
                  className="clay-control flex items-center gap-3 p-3"
                >
                  <span className="flex size-7 items-center justify-center rounded-lg bg-surface-alt text-xs font-bold text-accent-dark">
                    {index + 1}
                  </span>
                  <span className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                    {person.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {person.name}
                    </p>
                    <p className="text-xs text-muted">
                      {person.reviews} reviews
                    </p>
                  </div>
                  <span className="text-xs text-muted">{person.high} high</span>
                </motion.li>
              ))}
            </motion.ol>
          ) : (
            <EmptyChart message="Contributor signals will appear with review history." />
          )}
        </SpotlightCard>
      </div>
      <SpotlightCard className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-5 sm:px-6">
          <div>
            <h2 className="font-bold">Recent reviews</h2>
            <p className="mt-1 text-xs text-muted">
              Latest pull requests analyzed by PRism
            </p>
          </div>
          <ShieldCheck size={19} className="text-accent" />
        </div>
        {reviewItems.length ? (
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="divide-y divide-border"
          >
            {reviewItems.slice(0, 6).map((review) => (
              <motion.button
                variants={reveal}
                key={review._id}
                onClick={() => navigate(`/dashboard/reviews/${review._id}`)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface sm:px-6"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-surface-alt text-accent-dark">
                  <GitPullRequest size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {review.prTitle}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {review.repository?.fullName || "Repository"} · #
                    {review.prNumber}
                  </p>
                </div>
                <span className="clay-badge text-[10px] uppercase tracking-wide text-muted">
                  {review.status}
                </span>
                <ArrowRight size={15} className="text-muted" />
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <div className="px-6 py-14 text-center">
            <GitPullRequest className="mx-auto text-accent" />
            <h3 className="mt-4 font-bold">No reviews yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Open a pull request on a connected repository to see PRism in
              action.
            </p>
            <MagneticButton
              className="mt-5"
              onClick={() => navigate("/dashboard/repos")}
            >
              View repositories <ArrowRight size={16} />
            </MagneticButton>
          </div>
        )}
      </SpotlightCard>
    </div>
  );
}
