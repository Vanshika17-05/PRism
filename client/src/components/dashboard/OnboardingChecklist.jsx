import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Circle, ExternalLink, Github } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { MagneticButton } from "@/components/effects/MagneticButton";
import { GradientMeshBackground } from "@/components/effects/GradientMeshBackground";

export function OnboardingChecklist({ status }) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const authConfig = useQuery({
    queryKey: ["auth-config"],
    queryFn: async () => (await api.get("/api/auth/config")).data,
    staleTime: Infinity,
  });
  const steps = [
    {
      title: "Connect a repository",
      description:
        "Choose the repositories PRism can review from GitHub's installation screen.",
      complete: status.steps.repositoryConnected,
      action: !status.steps.repositoryConnected && (
        <MagneticButton
          onClick={() => {
            if (authConfig.data?.githubAppInstallUrl)
              window.location.assign(authConfig.data.githubAppInstallUrl);
          }}
          disabled={!authConfig.data?.githubAppInstallUrl}
        >
          <Github size={16} /> Connect a repository
        </MagneticButton>
      ),
    },
    {
      title: "Open a pull request",
      description:
        "Create or update a pull request in a connected repository. PRism receives the GitHub event and queues its review automatically.",
      complete: status.steps.pullRequestOpened,
      action: !status.steps.pullRequestOpened &&
        status.steps.repositoryConnected && (
          <a
            className="inline-flex items-center gap-1 text-sm font-bold text-accent-dark"
            href="https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request"
            target="_blank"
            rel="noreferrer"
          >
            How to open a pull request <ExternalLink size={14} />
          </a>
        ),
    },
    {
      title: "See your first review",
      description:
        "Once analysis finishes, findings and static-analysis signals appear together in Review Detail.",
      complete: status.steps.firstReviewCompleted,
      action: status.steps.pullRequestOpened && (
        <button
          className="inline-flex items-center gap-1 text-sm font-bold text-accent-dark"
          onClick={() => navigate("/dashboard/reviews")}
        >
          View reviews <ArrowRight size={14} />
        </button>
      ),
    },
  ];
  const activeIndex = steps.findIndex((step) => !step.complete);

  return (
    <div className="mx-auto max-w-4xl py-4 sm:py-10">
      <section className="clay-card relative overflow-hidden p-6 sm:p-10">
        <GradientMeshBackground />
        <div className="relative z-10">
          <span className="clay-badge inline-flex items-center gap-2 text-accent-dark">
            <Github size={14} /> GET STARTED
          </span>
          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
            Your first PRism review
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted sm:text-base">
            Connect GitHub once, then open a pull request. PRism handles the
            review workflow from there.
          </p>
          <motion.ol
            initial={reduce ? false : "hidden"}
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.1 } },
            }}
            className="mt-8 space-y-4"
          >
            {steps.map((step, index) => {
              const active = index === activeIndex;
              return (
                <motion.li
                  key={step.title}
                  variants={{
                    hidden: { opacity: 0, y: 14 },
                    show: { opacity: 1, y: 0 },
                  }}
                  className={`rounded-card border p-5 sm:p-6 ${
                    active
                      ? "border-accent bg-surface shadow-clay"
                      : "border-border bg-surface/70"
                  }`}
                  aria-current={active ? "step" : undefined}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${
                        step.complete
                          ? "bg-accent text-white"
                          : active
                            ? "bg-accent-light text-accent-dark"
                            : "bg-surface-alt text-muted"
                      }`}
                    >
                      {step.complete ? (
                        <Check size={18} />
                      ) : (
                        <Circle size={16} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-bold ${
                          step.complete ? "text-muted line-through" : ""
                        }`}
                      >
                        {index + 1}. {step.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted">
                        {step.description}
                      </p>
                      {step.action && <div className="mt-4">{step.action}</div>}
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </motion.ol>
        </div>
      </section>
    </div>
  );
}
