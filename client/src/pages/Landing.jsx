import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  Atom,
  BarChart3,
  Bot,
  BrainCircuit,
  Check,
  Code2,
  Database,
  Github,
  GitPullRequest,
  Menu,
  Moon,
  Network,
  Server,
  Settings2,
  Sparkles,
  Sun,
  Trophy,
  X,
} from "lucide-react";
import { GradientMeshBackground } from "@/components/effects/GradientMeshBackground";
import { SpotlightCard } from "@/components/effects/SpotlightCard";
import { useTheme } from "@/context/ThemeContext";

const MotionLink = motion.create(Link);
const revealContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const revealLine = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function LandingMagneticLink({ children, className = "" }) {
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 320, damping: 22 });
  const y = useSpring(useMotionValue(0), { stiffness: 320, damping: 22 });
  function move(event) {
    if (reduce) return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(((event.clientX - rect.left) / rect.width - 0.5) * 16);
    y.set(((event.clientY - rect.top) / rect.height - 0.5) * 16);
  }
  function reset() {
    x.set(0);
    y.set(0);
  }
  return (
    <MotionLink
      to="/login"
      onMouseMove={move}
      onMouseLeave={reset}
      style={reduce ? undefined : { x, y }}
      className={`clay-button inline-flex h-11 items-center justify-center gap-2 px-5 text-sm font-bold ${className}`}
    >
      {children}
    </MotionLink>
  );
}

function FeatureCard({ icon: Icon, title, text }) {
  const reduce = useReducedMotion();
  const rotateX = useSpring(useMotionValue(0), { stiffness: 260, damping: 24 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 260, damping: 24 });
  function move(event) {
    if (reduce) return;
    const rect = event.currentTarget.getBoundingClientRect();
    rotateY.set(((event.clientX - rect.left) / rect.width - 0.5) * 12);
    rotateX.set(-((event.clientY - rect.top) / rect.height - 0.5) * 12);
  }
  function reset() {
    rotateX.set(0);
    rotateY.set(0);
  }
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0 },
      }}
      onMouseMove={move}
      onMouseLeave={reset}
      style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
    >
      <SpotlightCard className="h-full p-6">
        <span className="clay-icon text-accent-dark">
          <Icon size={19} />
        </span>
        <h3 className="mt-5 font-extrabold">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
      </SpotlightCard>
    </motion.div>
  );
}

const features = [
  [
    Bot,
    "AI code review",
    "Structured, line-aware findings powered locally by Ollama.",
  ],
  [
    GitPullRequest,
    "Inline PR comments",
    "Validated suggestions posted directly where developers work.",
  ],
  [
    BarChart3,
    "Code health scoring",
    "Track severity and defect-density trends over time.",
  ],
  [
    Trophy,
    "Contributor leaderboard",
    "Celebrate consistent, low-risk contributions.",
  ],
  [
    Settings2,
    "Custom rules",
    "Teach every repository its own engineering standards.",
  ],
  [
    Sparkles,
    "Review personas",
    "Choose strict, balanced, or friendly feedback.",
  ],
  [
    BrainCircuit,
    "Review memory",
    "Chroma vector search recalls similar past findings.",
  ],
  [
    Code2,
    "Complexity analysis",
    "Radon and deterministic metrics complement the LLM.",
  ],
];
const tech = [
  [Atom, "React"],
  [Server, "Node"],
  [Github, "GitHub"],
  [Database, "MongoDB"],
  [Bot, "Ollama"],
  [Code2, "Python"],
];
function Logo() {
  return (
    <Link to="/" className="flex items-center gap-3">
      <span className="logo-mark">
        <i />
        <i />
      </span>
      <b className="text-xl tracking-[-.04em]">
        PRism<span className="text-accent">.</span>
      </b>
    </Link>
  );
}
function DashboardPreview() {
  const target = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target,
    offset: ["start end", "end start"],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [28, -28]);
  return (
    <motion.div
      ref={target}
      style={reduce ? undefined : { y: parallaxY }}
      className="mx-auto max-w-4xl"
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -12, 0] }}
        transition={
          reduce
            ? undefined
            : { duration: 7, repeat: Infinity, ease: "easeInOut" }
        }
        className="clay-card p-4 sm:p-6"
      >
      <div className="flex gap-3">
        <div className="hidden w-32 rounded-[18px] bg-surface-alt p-3 sm:block">
          <div className="h-7 w-20 rounded-xl bg-accent/30" />
          <div className="mt-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-7 rounded-xl ${i === 1 ? "bg-accent/30" : "bg-surface"}`}
              />
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Reviews", "1,284"],
              ["Health", "92"],
              ["Findings", "38"],
            ].map(([a, b]) => (
              <div className="clay-card p-3" key={a}>
                <p className="text-[9px] text-muted">{a}</p>
                <p className="mt-1 text-lg font-extrabold">{b}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1.5fr_1fr]">
            <div className="clay-card h-40 p-4">
              <p className="text-xs font-bold">Review activity</p>
              <svg viewBox="0 0 300 100" className="mt-4 h-24 w-full">
                <path
                  d="M0 80 C40 70,55 25,95 48 S155 75,185 35 S245 20,300 8"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <path
                  d="M0 80 C40 70,55 25,95 48 S155 75,185 35 S245 20,300 8 L300 100 L0 100Z"
                  fill="var(--accent-glow)"
                />
              </svg>
            </div>
            <div className="clay-card h-40 p-4">
              <p className="text-xs font-bold">Code health</p>
              <div className="mx-auto mt-4 grid size-20 place-items-center rounded-full border-[9px] border-accent text-xl font-extrabold">
                92
              </div>
            </div>
          </div>
        </div>
      </div>
      </motion.div>
    </motion.div>
  );
}
export default function Landing() {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="min-h-screen overflow-hidden bg-bg text-primary">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <button
              className="clay-icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <LandingMagneticLink>Sign in with GitHub</LandingMagneticLink>
          </div>
          <button
            className="clay-icon md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <div className="border-t border-border bg-bg p-5 md:hidden">
            <div className="flex flex-col gap-4">
              <a href="#features" onClick={() => setOpen(false)}>
                Features
              </a>
              <a href="#how" onClick={() => setOpen(false)}>
                How it works
              </a>
              <Link to="/login" className="clay-button py-3 text-center">
                Sign in with GitHub
              </Link>
            </div>
          </div>
        )}
      </header>
      <main>
        <section className="landing-hero-mesh relative px-5 pb-20 pt-36 text-center">
          <GradientMeshBackground />
          <div className="relative mx-auto max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="clay-badge inline-flex items-center gap-2"
            >
              <Sparkles size={14} /> AI review that remembers
            </motion.div>
            <h1 className="mx-auto mt-7 max-w-4xl text-5xl font-black tracking-[-.06em] sm:text-7xl">
              Ship better code with every pull request.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-muted sm:text-lg">
              PRism blends AI review, vector memory, and deterministic
              complexity analysis into clear feedback your team can trust.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <LandingMagneticLink>
                Sign in with GitHub <ArrowRight size={17} />
              </LandingMagneticLink>
              <a
                href="https://github.com/Vanshika17-05/PRism"
                target="_blank"
                rel="noreferrer"
                className="clay-control inline-flex h-11 items-center gap-2 px-5 text-sm font-bold"
              >
                <Github size={17} /> View source
              </a>
            </div>
            <div className="mt-16">
              <DashboardPreview />
            </div>
          </div>
        </section>
        <section className="border-y border-border py-8">
          <p className="text-center text-xs font-bold uppercase tracking-[.2em] text-muted">
            Built with a production-minded stack
          </p>
          <div className="mx-auto mt-5 flex max-w-4xl flex-wrap justify-center gap-7">
            {tech.map(([Icon, name]) => (
              <span
                key={name}
                className="flex items-center gap-2 font-semibold text-muted"
              >
                <Icon size={20} className="text-accent" />
                {name}
              </span>
            ))}
          </div>
        </section>
        <section id="features" className="mx-auto max-w-7xl px-5 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-bold text-accent-dark">
              ENGINEERING SIGNAL, NOT NOISE
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">
              One reviewer. Eight superpowers.
            </h2>
          </div>
          <motion.div
            initial={reduce ? false : "hidden"}
            whileInView="show"
            viewport={{ once: true }}
            variants={{ show: { transition: { staggerChildren: 0.06 } } }}
            className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {features.map(([Icon, title, text]) => (
              <FeatureCard
                key={title}
                icon={Icon}
                title={title}
                text={text}
              />
            ))}
          </motion.div>
        </section>
        <section id="how" className="bg-surface-clay/40 px-5 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <p className="font-bold text-accent-dark">HOW IT WORKS</p>
              <h2 className="mt-3 text-4xl font-black">
                From webhook to wisdom.
              </h2>
            </div>
            <div className="relative mt-12 grid gap-6 md:grid-cols-3">
              <svg
                className="pointer-events-none absolute left-[16.67%] top-7 hidden h-2 w-[66.66%] overflow-visible md:block"
                viewBox="0 0 800 8"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <motion.path
                  d="M0 4 H800"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeDasharray="10 12"
                  initial={reduce ? false : { strokeDashoffset: 820, opacity: 0 }}
                  whileInView={{ strokeDashoffset: 0, opacity: 0.65 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                />
              </svg>
              {[
                [GitPullRequest, "1", "A pull request changes"],
                [Network, "2", "PRism analyzes and remembers"],
                [Check, "3", "Findings land on GitHub"],
              ].map(([Icon, n, t], index) => (
                <motion.div
                  className="clay-card relative p-7 text-center"
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ delay: index * 0.2, duration: 0.35 }}
                  key={n}
                >
                  <motion.span
                    className="mx-auto grid size-14 place-items-center rounded-[20px] bg-accent text-xl font-black text-surface"
                    initial={reduce ? false : { scale: 0.65, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 18,
                      delay: 0.15 + index * 0.2,
                    }}
                  >
                    {n}
                  </motion.span>
                  <Icon className="mx-auto mt-6 text-accent" />
                  <h3 className="mt-4 font-extrabold">{t}</h3>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
        <section className="mx-auto grid max-w-6xl gap-10 px-5 py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="font-bold text-accent-dark">REAL REVIEW OUTPUT</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">
              Specific enough to fix. Calm enough to trust.
            </h2>
            <p className="mt-5 leading-7 text-muted">
              Every inline comment is verified against a real changed line
              before PRism sends it to GitHub.
            </p>
          </div>
          <SpotlightCard className="p-6">
            <motion.div
              variants={revealContainer}
              initial={reduce ? false : "hidden"}
              whileInView="show"
              viewport={{ once: true, amount: 0.45 }}
            >
              <motion.div
                variants={revealLine}
                className="flex items-center gap-3"
              >
                <span className="size-3 rounded-full bg-high" />
                <span className="clay-badge">HIGH · SECURITY</span>
                <span className="ml-auto font-mono text-xs text-muted">
                  auth.js:42
                </span>
              </motion.div>
              <motion.h3 variants={revealLine} className="mt-5 font-extrabold">
                Authorization check can be bypassed
              </motion.h3>
              <motion.p
                variants={revealLine}
                className="mt-3 text-sm leading-6 text-muted"
              >
                The service-token fallback accepts a decoded token without
                validating its audience, allowing a token minted for another
                service.
              </motion.p>
              <motion.pre
                variants={revealLine}
                className="mt-4 overflow-auto rounded-[18px] bg-[#21130d] p-4 text-xs text-accent-light"
              >
                <code>
                  if (payload.aud !== env.AUTH_AUDIENCE) throw new
                  UnauthorizedError();
                </code>
              </motion.pre>
              <motion.div
                variants={revealLine}
                className="mt-4 flex gap-3 text-xs text-muted"
              >
                <span>96% confidence</span>
                <span>·</span>
                <span>Similar to PR #12</span>
              </motion.div>
            </motion.div>
          </SpotlightCard>
        </section>
        <section id="pricing" className="px-5 pb-24">
          <div className="clay-card relative mx-auto max-w-5xl overflow-hidden p-10 text-center sm:p-16">
            <GradientMeshBackground />
            <div className="relative">
              <h2 className="text-4xl font-black">
                Make every review compound.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted">
                Run locally, then connect GitHub and Ollama when your team is
                ready.
              </p>
              <Link
                to="/login"
                className="clay-button mt-8 inline-flex items-center gap-2 px-6 py-3 font-bold"
              >
                Sign in with GitHub <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-border px-5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-muted sm:flex-row">
          <Logo />
          <p>Built by Vanshika Sambher · {new Date().getFullYear()}</p>
          <a
            href="https://github.com/Vanshika17-05/PRism"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2"
          >
            <Github size={16} /> GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
