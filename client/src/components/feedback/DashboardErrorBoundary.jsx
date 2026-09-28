import { Component } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { useLocation } from "react-router-dom";
import { GradientMeshBackground } from "@/components/effects/GradientMeshBackground";

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Dashboard render failed", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="relative grid min-h-screen place-items-center overflow-hidden bg-bg p-5 text-primary">
        <GradientMeshBackground />
        <section className="clay-card relative z-10 w-full max-w-lg p-8 text-center sm:p-10">
          <span className="clay-icon mx-auto text-high">
            <TriangleAlert size={20} />
          </span>
          <h1 className="mt-5 text-2xl font-black">Something went wrong</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            PRism hit an unexpected display error. Your repositories and reviews
            are safe.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              className="clay-button inline-flex items-center gap-2 px-5 py-3 font-bold"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={16} /> Reload
            </button>
            <a
              className="clay-control inline-flex items-center px-5 py-3 text-sm font-bold"
              href="https://github.com/Vanshika17-05/PRism/issues/new"
              target="_blank"
              rel="noreferrer"
            >
              Report this issue
            </a>
          </div>
        </section>
      </main>
    );
  }
}

export function DashboardErrorBoundary({ children }) {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
}
