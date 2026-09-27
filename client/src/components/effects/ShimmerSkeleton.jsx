import { cn } from "@/lib/utils";
export function ShimmerSkeleton({ className = "" }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("shimmer rounded-card", className)}
    />
  );
}
