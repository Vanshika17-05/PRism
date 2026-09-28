import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";
import { api } from "@/lib/api";
import { useOrganization } from "@/context/OrganizationContext";
import { ShimmerSkeleton } from "@/components/effects/ShimmerSkeleton";
import { QueryErrorCard } from "@/components/feedback/QueryErrorCard";

const labels = {
  "settings.updated": "updated repository settings",
  "finding.dismissed": "updated a finding's dismissal",
  "member.invited": "invited a team member",
  "member.role_changed": "changed a member role",
  "member.removed": "removed a team member",
  "provider.changed": "changed the AI provider",
  "repo.connected": "connected a repository",
  "repo.disconnected": "disconnected a repository",
  "suppression.removed": "removed a suppression pattern",
  "review.retried": "retried a failed review",
  "failed_review.dismissed": "dismissed a failed review",
  "suggestion.posted": "posted a suggested fix",
};

function relativeTime(value) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const ranges = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.345, "week"],
    [12, "month"],
    [Infinity, "year"],
  ];
  let amount = seconds;
  for (const [size, unit] of ranges) {
    if (Math.abs(amount) < size)
      return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
        Math.round(amount),
        unit,
      );
    amount /= size;
  }
  return "recently";
}

function actionText(entry) {
  if (entry.action === "provider.changed")
    return `changed AI provider from ${entry.before?.aiProvider || "unset"} to ${entry.after?.aiProvider || "unset"}`;
  if (entry.action === "member.role_changed")
    return `changed member role from ${entry.before?.role} to ${entry.after?.role}`;
  return labels[entry.action] || entry.action.replaceAll(".", " ");
}

export default function AuditLogPage() {
  const { current } = useOrganization();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const audit = useQuery({
    queryKey: ["audit-log", current?._id, page, action],
    enabled: !!current,
    queryFn: async () =>
      (
        await api.get(`/api/organizations/${current._id}/audit-log`, {
          params: { page, ...(action ? { action } : {}) },
        })
      ).data,
  });
  return (
    <div>
      <p className="text-sm font-bold text-accent-dark">
        SECURITY &amp; ACTIVITY
      </p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Audit log</h1>
          <p className="mt-2 text-sm text-muted">
            An immutable history of changes in {current?.name}.
          </p>
        </div>
        <select
          className="clay-input min-w-52 text-sm"
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All activity</option>
          {(audit.data?.actions || []).map((item) => (
            <option key={item} value={item}>
              {labels[item] || item}
            </option>
          ))}
        </select>
      </div>
      <section className="clay-card mt-7 overflow-hidden">
        {audit.isLoading ? (
          <div className="space-y-3 p-6">
            <ShimmerSkeleton className="h-16" />
            <ShimmerSkeleton className="h-16" />
          </div>
        ) : audit.isError ? (
          <div className="p-6">
            <QueryErrorCard
              compact
              title="Audit activity could not be loaded"
              error={audit.error}
              onRetry={() => audit.refetch()}
            />
          </div>
        ) : audit.data?.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="p-4">Actor</th>
                  <th className="p-4">Activity</th>
                  <th className="p-4">Target</th>
                  <th className="p-4">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {audit.data.items.map((entry) => {
                  const actor = entry.actorId || {};
                  return (
                    <tr key={entry._id}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            className="size-9 rounded-full"
                            src={
                              actor.avatarUrl ||
                              actor.githubAvatarUrl ||
                              `https://github.com/${actor.username}.png`
                            }
                            alt=""
                          />
                          <div>
                            <p className="font-bold">
                              {actor.displayName ||
                                actor.name ||
                                actor.username ||
                                "Unknown user"}
                            </p>
                            <p className="text-xs text-muted">
                              @{actor.username || "unknown"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-medium">{actionText(entry)}</td>
                      <td className="p-4">
                        <span className="clay-badge">{entry.targetType}</span>
                        <p className="mt-1 max-w-40 truncate text-xs text-muted">
                          {entry.targetId}
                        </p>
                      </td>
                      <td
                        className="p-4 text-muted"
                        title={new Date(entry.createdAt).toLocaleString()}
                      >
                        {relativeTime(entry.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-56 place-items-center text-center">
            <div>
              <ScrollText className="mx-auto text-accent" />
              <p className="mt-3 font-bold">No matching activity</p>
              <p className="mt-1 text-sm text-muted">
                Changes will appear here as they happen.
              </p>
            </div>
          </div>
        )}
      </section>
      <div className="mt-5 flex items-center justify-end gap-3">
        <button
          className="clay-icon"
          disabled={page <= 1}
          onClick={() => setPage((value) => value - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={17} />
        </button>
        <span className="text-sm text-muted">
          Page {audit.data?.pagination.page || page} of{" "}
          {audit.data?.pagination.pages || 1}
        </span>
        <button
          className="clay-icon"
          disabled={page >= (audit.data?.pagination.pages || 1)}
          onClick={() => setPage((value) => value + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}
