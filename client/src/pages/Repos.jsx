import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  Clipboard,
  ExternalLink,
  Github,
  Plus,
  Settings2,
  ShieldX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { TiltCard } from "@/components/effects/TiltCard";
import { SpotlightCard } from "@/components/effects/SpotlightCard";
import { ShimmerSkeleton } from "@/components/effects/ShimmerSkeleton";
import { MagneticButton } from "@/components/effects/MagneticButton";
import { MorphingTabs } from "@/components/effects/MorphingTabs";
import { useRepos } from "@/hooks/useRepos";
import { useStats } from "@/hooks/useStats";
import { api } from "@/lib/api";
import { useOrganization } from "@/context/OrganizationContext";

const personas = ["strict", "balanced", "friendly"].map((value) => ({
  value,
  label: value[0].toUpperCase() + value.slice(1),
}));

function SettingsDrawer({ repo, onClose }) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState(repo.settings);
  const [tag, setTag] = useState("");
  const [rule, setRule] = useState("");
  const [copied, setCopied] = useState(false);
  const suppressions = useQuery({
    queryKey: ["suppressions", repo._id],
    queryFn: async () =>
      (await api.get(`/api/repos/${repo._id}/suppressions`)).data.patterns,
  });
  const removeSuppression = useMutation({
    mutationFn: (id) => api.delete(`/api/repos/${repo._id}/suppressions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppressions", repo._id] });
      toast.success("Suppression removed");
    },
  });
  const save = useMutation({
    mutationFn: () => api.patch(`/api/repos/${repo._id}/settings`, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repos"] });
      toast.success("Repository settings saved");
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });
  function add(key, value, setter) {
    const clean = value.trim();
    if (clean && !settings[key].includes(clean))
      setSettings((current) => ({
        ...current,
        [key]: [...current[key], clean],
      }));
    setter("");
  }
  const badgeUrl = `${import.meta.env.VITE_BADGE_SERVICE_URL || "http://localhost:3000"}/api/badge/${repo._id}.svg`;
  const markdown = `![PRism Score](${badgeUrl})`;
  const budget = settings.monthlyTokenBudget ?? 500000;
  const used = settings.tokensUsedThisMonth ?? 0;
  const budgetPercent = budget
    ? Math.min(100, Math.round((used / budget) * 100))
    : 100;
  return (
    <motion.aside
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-border bg-bg p-6 shadow-2xl"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-accent-dark">
            REPOSITORY SETTINGS
          </p>
          <h2 className="mt-1 text-2xl font-black">{repo.fullName}</h2>
        </div>
        <button className="clay-icon" onClick={onClose}>
          <X />
        </button>
      </div>
      <div className="mt-8 space-y-7">
        <section>
          <label className="text-sm font-bold">Ignored paths</label>
          <div className="mt-3 flex gap-2">
            <input
              className="clay-input"
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              placeholder="dist/**"
            />
            <button
              className="clay-icon shrink-0"
              onClick={() => add("ignoredPaths", tag, setTag)}
            >
              <Plus />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {settings.ignoredPaths.map((item) => (
              <button
                key={item}
                className="clay-badge"
                onClick={() =>
                  setSettings((current) => ({
                    ...current,
                    ignoredPaths: current.ignoredPaths.filter(
                      (value) => value !== item,
                    ),
                  }))
                }
              >
                {item} ×
              </button>
            ))}
          </div>
        </section>
        <section>
          <p className="text-sm font-bold">Severity threshold</p>
          <MorphingTabs
            className="mt-3"
            items={["low", "medium", "high"].map((value) => ({
              value,
              label: value[0].toUpperCase() + value.slice(1),
            }))}
            value={settings.severityThreshold}
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                severityThreshold: value,
              }))
            }
            layoutId="severity-setting"
          />
        </section>
        <section>
          <p className="text-sm font-bold">Review persona</p>
          <MorphingTabs
            className="mt-3"
            items={personas}
            value={settings.persona || "balanced"}
            onChange={(value) =>
              setSettings((current) => ({ ...current, persona: value }))
            }
            layoutId="persona-setting"
          />
        </section>
        <section>
          <label className="text-sm font-bold" htmlFor="ai-provider">
            AI provider
          </label>
          <select
            id="ai-provider"
            className="clay-input mt-3"
            value={settings.aiProvider || "openai"}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                aiProvider: event.target.value,
              }))
            }
          >
            <option value="openai">OpenAI</option>
            <option value="gemini">Google Gemini</option>
            <option value="claude">Anthropic Claude</option>
          </select>
          <p className="mt-2 text-xs text-muted">
            Each provider requires its matching API key in the server
            environment.
          </p>
        </section>
        <section className="clay-control p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold">Monthly AI token budget</p>
              <p className="mt-1 text-xs text-muted">
                {Math.round(used / 1000)}k / {Math.round(budget / 1000)}k tokens
                used this month
              </p>
            </div>
            <span className="text-sm font-black text-accent-dark">
              {budgetPercent}%
            </span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-alt">
            <motion.div
              className="h-full rounded-full bg-accent"
              animate={{ width: `${budgetPercent}%` }}
            />
          </div>
          <label className="mt-4 block text-xs font-bold text-muted">
            Monthly limit
            <input
              className="clay-input mt-2"
              type="number"
              min="0"
              max="100000000"
              value={budget}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  monthlyTokenBudget: Number(event.target.value),
                }))
              }
            />
          </label>
          <p className="mt-2 text-xs leading-5 text-muted">
            At the limit, PRism skips local AI and still runs deterministic
            analysis.
          </p>
        </section>
        <section>
          <label className="text-sm font-bold">Custom review rules</label>
          <div className="mt-3 flex gap-2">
            <input
              className="clay-input"
              value={rule}
              onChange={(event) => setRule(event.target.value)}
              placeholder="Flag endpoints without authorization"
            />
            <button
              className="clay-icon shrink-0"
              onClick={() => add("customRules", rule, setRule)}
            >
              <Plus />
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {settings.customRules.map((item) => (
              <button
                key={item}
                className="clay-control w-full p-3 text-left text-sm"
                onClick={() =>
                  setSettings((current) => ({
                    ...current,
                    customRules: current.customRules.filter(
                      (value) => value !== item,
                    ),
                  }))
                }
              >
                {item}
                <span className="float-right">×</span>
              </button>
            ))}
          </div>
        </section>
        <section>
          <div className="flex items-center gap-2">
            <ShieldX size={17} className="text-accent" />
            <p className="text-sm font-bold">Learned non-issues</p>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">
            Dismissed false positives suppress strongly similar AI findings.
            Undo any pattern that was learned accidentally.
          </p>
          <div className="mt-3 space-y-2">
            {suppressions.isLoading ? (
              <ShimmerSkeleton className="h-20" />
            ) : suppressions.data?.length ? (
              suppressions.data.map((pattern) => (
                <div className="clay-control p-3" key={pattern.id}>
                  <p className="line-clamp-2 text-xs font-semibold">
                    {pattern.text}
                  </p>
                  {pattern.reason && (
                    <p className="mt-1 text-xs text-muted">
                      Reason: {pattern.reason}
                    </p>
                  )}
                  <button
                    className="mt-2 text-xs font-bold text-accent-dark"
                    onClick={() => removeSuppression.mutate(pattern.id)}
                  >
                    Undo suppression
                  </button>
                </div>
              ))
            ) : (
              <p className="rounded-[16px] border border-border p-4 text-xs text-muted">
                No suppression patterns learned yet.
              </p>
            )}
          </div>
        </section>
        <section className="clay-card p-5">
          <p className="text-sm font-bold">PRism Score badge</p>
          <img
            className="mt-4"
            src={badgeUrl}
            alt="Current PRism code-health score"
          />
          <button
            className="mt-4 flex items-center gap-2 text-xs font-bold text-accent-dark"
            onClick={async () => {
              await navigator.clipboard.writeText(markdown);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check size={15} /> : <Clipboard size={15} />} Copy
            Markdown
          </button>
        </section>
        <MagneticButton
          className="w-full"
          disabled={save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Saving…" : "Save settings"}
        </MagneticButton>
      </div>
    </motion.aside>
  );
}

export default function Repos() {
  const query = useRepos();
  const stats = useStats(query.data || []);
  const queryClient = useQueryClient();
  const { role } = useOrganization();
  const canManage = role === "owner" || role === "admin";
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState(null);
  const authConfig = useQuery({
    queryKey: ["auth-config"],
    queryFn: async () => (await api.get("/api/auth/config")).data,
    staleTime: Infinity,
  });
  const installUrl = authConfig.data?.githubAppInstallUrl;
  const installationCompleted = searchParams.get("installed") === "true";
  const connectRepository = () => {
    if (installUrl) window.location.assign(installUrl);
    else toast.error("GITHUB_APP_SLUG is not configured on the server");
  };
  useEffect(() => {
    if (!installationCompleted) return undefined;
    toast.success("Repository connected! It may take a few seconds to appear.");
    queryClient.invalidateQueries({ queryKey: ["repos"] });
    const retries = [
      window.setTimeout(
        () => queryClient.refetchQueries({ queryKey: ["repos"] }),
        2_000,
      ),
      window.setTimeout(
        () => queryClient.refetchQueries({ queryKey: ["repos"] }),
        5_000,
      ),
      window.setTimeout(() => {
        setSearchParams((current) => {
          const next = new URLSearchParams(current);
          next.delete("installed");
          return next;
        }, { replace: true });
      }, 5_100),
    ];
    return () => retries.forEach(window.clearTimeout);
  }, [installationCompleted, queryClient, setSearchParams]);
  const toggle = useMutation({
    mutationFn: (repo) =>
      api.patch(`/api/repos/${repo._id}/settings`, {
        isActive: !repo.isActive,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["repos"] }),
  });
  if (query.isLoading)
    return (
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <ShimmerSkeleton key={item} className="h-64" />
        ))}
      </div>
    );
  return (
    <div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold text-accent-dark">REPOSITORIES</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">
            Connected codebases
          </h1>
          <p className="mt-2 text-sm text-muted">
            Control review behavior and improve signal quality with feedback.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            className="clay-control inline-flex items-center gap-2 px-4 py-3 text-sm font-bold"
            href="https://github.com/settings/installations"
            target="_blank"
            rel="noreferrer"
          >
            Manage installations <ExternalLink size={16} />
          </a>
          <MagneticButton onClick={connectRepository}>
            <Plus size={17} /> Connect a repository
          </MagneticButton>
        </div>
      </div>
      {!query.data?.length && (
        <SpotlightCard className="mt-8 p-10 text-center">
          <span className="clay-icon mx-auto text-accent">
            <Github />
          </span>
          <h2 className="mt-5 text-2xl font-black">Connect your first repository</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">
            Install the PRism GitHub App and choose the repositories you want
            reviewed. Repository access always stays under GitHub's control.
          </p>
          <MagneticButton className="mx-auto mt-6" onClick={connectRepository}>
            <Plus size={17} /> Connect a repository
          </MagneticButton>
        </SpotlightCard>
      )}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.05 } } }}
        className={`${query.data?.length ? "mt-7" : "mt-0"} grid gap-6 md:grid-cols-2 xl:grid-cols-3`}
      >
        {query.data?.map((repo, index) => {
          const accuracy = stats[index]?.data?.signalAccuracy;
          const Trend =
            accuracy?.trend === "up"
              ? ArrowUp
              : accuracy?.trend === "down"
                ? ArrowDown
                : ArrowRight;
          return (
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0 },
              }}
              key={repo._id}
            >
              <TiltCard className="h-full">
                <SpotlightCard className="h-full border-0 p-6 shadow-none">
                  <div className="flex items-start justify-between">
                    <span className="clay-icon text-accent">
                      <Github />
                    </span>
                    <button
                      role="switch"
                      aria-checked={repo.isActive}
                      disabled={!canManage}
                      title={canManage ? "Toggle reviews" : "Admin role required"}
                      onClick={() => toggle.mutate(repo)}
                      className={`relative h-7 w-12 rounded-full p-1 transition ${repo.isActive ? "bg-accent" : "bg-surface-alt"}`}
                    >
                      <motion.span
                        className="block size-5 rounded-full bg-surface shadow"
                        animate={{ x: repo.isActive ? 20 : 0 }}
                      />
                    </button>
                  </div>
                  <h2 className="mt-6 text-lg font-black">{repo.fullName}</h2>
                  <p className="mt-2 text-sm text-muted">
                    {repo.isActive
                      ? "Reviews are active"
                      : "Reviewing is paused"}{" "}
                    · {repo.settings.persona || "balanced"} persona
                  </p>
                  <div className="mt-5 flex items-end justify-between rounded-[18px] border border-border bg-surface-alt p-4">
                    <div>
                      <p className="text-xs font-bold text-muted">
                        SIGNAL ACCURACY · 30 DAYS
                      </p>
                      <p className="mt-1 text-3xl font-black">
                        {accuracy?.value ?? "—"}%
                      </p>
                    </div>
                    <span
                      className={`flex items-center gap-1 text-xs font-bold ${accuracy?.trend === "down" ? "text-high" : "text-accent-dark"}`}
                    >
                      <Trend size={15} />
                      vs prior 30d
                    </span>
                  </div>
                  <button
                    className="clay-control mt-6 flex w-full items-center justify-center gap-2 py-3 text-sm font-bold"
                    onClick={() => setSelected(repo)}
                    disabled={!canManage}
                    title={canManage ? "Configure repository" : "Admin role required"}
                  >
                    <Settings2 size={16} /> Configure
                  </button>
                </SpotlightCard>
              </TiltCard>
            </motion.div>
          );
        })}
      </motion.div>
      <AnimatePresence>
        {selected && (
          <>
            <motion.button
              aria-label="Close settings"
              className="fixed inset-0 z-40 bg-[#16100C]/65 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
            />
            <SettingsDrawer repo={selected} onClose={() => setSelected(null)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
