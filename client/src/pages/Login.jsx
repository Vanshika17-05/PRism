import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Github, Moon, Sun } from "lucide-react";
import { GradientMeshBackground } from "@/components/effects/GradientMeshBackground";
import { api } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";

export default function Login() {
  const { theme, toggleTheme } = useTheme();
  const [params] = useSearchParams();
  const config = useQuery({
    queryKey: ["auth-config"],
    queryFn: async () => (await api.get("/api/auth/config")).data,
    retry: false,
  });
  const error = params.get("error");
  return (
    <div className="relative flex min-h-[100dvh] w-full min-w-0 items-center justify-center overflow-hidden bg-bg px-5 py-20 text-primary">
      <GradientMeshBackground />
      <Link
        to="/"
        className="absolute left-5 top-5 z-20 flex items-center gap-2 text-sm font-semibold text-muted"
      >
        <ArrowLeft size={17} /> Back home
      </Link>
      <button
        className="clay-icon absolute right-5 top-5 z-20"
        onClick={toggleTheme}
        aria-label="Toggle theme"
      >
        {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
      </button>
      <section className="clay-card relative z-10 w-[min(100%,28rem)] min-w-0 shrink-0 p-8 text-center sm:p-10">
        <span className="logo-mark mx-auto">
          <i />
          <i />
        </span>
        <h1 className="mt-6 text-2xl font-black">Sign in to PRism</h1>
        {config.isLoading ? (
          <p className="mt-4 text-sm text-muted">
            Checking GitHub configuration…
          </p>
        ) : config.data?.githubConfigured ? (
          <a
            href="/api/auth/github"
            className="clay-button mt-8 inline-flex w-full items-center justify-center gap-3 px-5 py-3 font-bold"
          >
            <Github size={20} /> Sign in with GitHub
          </a>
        ) : (
          <div className="mt-7 rounded-control border border-border bg-surface-alt p-5">
            <p className="font-bold">
              GitHub sign-in isn&apos;t configured yet
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Add the GitHub OAuth client ID and secret to the server
              environment, then restart PRism.
            </p>
          </div>
        )}
        {error && (
          <p className="mt-5 text-sm font-semibold text-high">
            GitHub sign-in failed. Please try again.
          </p>
        )}
      </section>
    </div>
  );
}
