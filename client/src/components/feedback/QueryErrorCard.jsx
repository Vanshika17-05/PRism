import { RefreshCw, TriangleAlert } from "lucide-react";
import { MagneticButton } from "@/components/effects/MagneticButton";

export function QueryErrorCard({ title, error, onRetry, compact = false }) {
  return (
    <div
      className={`rounded-card border border-high/20 bg-high/5 text-center ${compact ? "p-4" : "clay-card p-8"}`}
      role="alert"
    >
      <TriangleAlert className="mx-auto text-high" size={compact ? 20 : 26} />
      <h2 className={`font-bold ${compact ? "mt-2 text-sm" : "mt-4 text-lg"}`}>
        {title}
      </h2>
      {error?.message && (
        <p className="mt-2 text-sm text-muted">{error.message}</p>
      )}
      {onRetry && (
        <MagneticButton className="mt-4" onClick={onRetry}>
          <RefreshCw size={15} /> Try again
        </MagneticButton>
      )}
    </div>
  );
}
