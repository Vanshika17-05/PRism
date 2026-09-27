import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Laptop,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ShimmerSkeleton } from "@/components/effects/ShimmerSkeleton";
import { Link } from "react-router-dom";

function FailedJob({ job, retry, dismiss }) {
  const payload = job.payload || {};
  return (
    <article className="clay-control p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-black">PR #{payload.prNumber || "unknown"}</p>
          <p className="mt-1 text-xs text-muted">
            Delivery {payload.deliveryId || "unknown"} · {job.attemptsMade}{" "}
            attempts
          </p>
        </div>
        <span className="clay-badge text-high">Failed</span>
      </div>
      <p className="mt-4 rounded-control border border-high/20 bg-high/5 p-3 text-sm text-high">
        {job.error}
      </p>
      <p className="mt-3 break-all text-xs text-muted">
        Head SHA: {payload.headSha || "unknown"}
      </p>
      <div className="mt-5 flex gap-3">
        <button
          className="clay-control flex items-center gap-2 px-4 py-2 text-sm font-bold text-accent-dark"
          disabled={retry.isPending}
          onClick={() => retry.mutate(job._id)}
        >
          <RotateCcw size={15} /> Retry
        </button>
        <button
          className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-muted hover:text-high"
          disabled={dismiss.isPending}
          onClick={() => dismiss.mutate(job._id)}
        >
          <Trash2 size={15} /> Dismiss
        </button>
      </div>
    </article>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const failed = useQuery({
    queryKey: ["failed-reviews"],
    queryFn: async () => (await api.get("/api/failed-reviews")).data,
    refetchInterval: 15_000,
  });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["failed-reviews"] });
  const retry = useMutation({
    mutationFn: (id) => api.post(`/api/failed-reviews/${id}/retry`),
    onSuccess: () => {
      toast.success("Review re-queued");
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const dismiss = useMutation({
    mutationFn: (id) => api.delete(`/api/failed-reviews/${id}`),
    onSuccess: () => {
      toast.success("Failed job dismissed");
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const sessions = useQuery({
    queryKey: ["auth-sessions"],
    queryFn: async () => (await api.get("/api/auth/sessions")).data.sessions,
  });
  const refreshSessions = () =>
    queryClient.invalidateQueries({ queryKey: ["auth-sessions"] });
  const revoke = useMutation({
    mutationFn: (jti) => api.delete(`/api/auth/sessions/${jti}`),
    onSuccess: () => {
      toast.success("Session revoked");
      refreshSessions();
    },
    onError: (error) => toast.error(error.message),
  });
  const revokeOthers = useMutation({
    mutationFn: () => api.post("/api/auth/sessions/revoke-others"),
    onSuccess: () => {
      toast.success("Other sessions revoked");
      refreshSessions();
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <div>
      <p className="text-sm font-bold text-accent-dark">SYSTEM SETTINGS</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight">Operations</h1>
      <p className="mt-2 text-sm text-muted">
        Recover permanently failed pull-request reviews without losing their
        original payload.
      </p>
      <Link
        className="clay-control mt-5 inline-flex px-4 py-2 text-sm font-bold text-accent-dark"
        to="/dashboard/settings/team"
      >
        Manage team & roles
      </Link>
      <section className="clay-card mt-8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="clay-icon text-accent">
              <Laptop size={19} />
            </span>
            <div>
              <h2 className="text-xl font-black">Active sessions</h2>
              <p className="text-sm text-muted">
                Devices currently signed in to your account.
              </p>
            </div>
          </div>
          <button
            className="clay-control px-4 py-2 text-sm font-bold text-accent-dark"
            disabled={revokeOthers.isPending}
            onClick={() => revokeOthers.mutate()}
          >
            Revoke all other sessions
          </button>
        </div>
        <div className="mt-5 space-y-3">
          {sessions.isLoading ? (
            <ShimmerSkeleton className="h-20" />
          ) : (
            sessions.data?.map((session) => (
              <div
                key={session.jti}
                className="clay-control flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-bold">
                    {session.current ? "This device" : "Signed-in device"}
                  </p>
                  <p className="mt-1 max-w-2xl truncate text-xs text-muted">
                    {session.userAgent}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Signed in {new Date(session.issuedAt).toLocaleString()}
                  </p>
                </div>
                <button
                  className="flex items-center gap-2 text-sm font-bold text-high"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate(session.jti)}
                >
                  <Trash2 size={15} /> Revoke
                </button>
              </div>
            ))
          )}
        </div>
      </section>
      <section className="clay-card mt-8 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="clay-icon text-high">
              <AlertTriangle size={19} />
            </span>
            <div>
              <h2 className="text-xl font-black">Failed Jobs</h2>
              <p className="text-sm text-muted">
                Jobs appear here after all three retry attempts fail.
              </p>
            </div>
          </div>
          <span className="clay-badge">
            {failed.data?.pagination.total || 0}
          </span>
        </div>
        <div className="mt-6 space-y-4">
          {failed.isLoading ? (
            <>
              <ShimmerSkeleton className="h-40" />
              <ShimmerSkeleton className="h-40" />
            </>
          ) : failed.isError ? (
            <p className="rounded-control border border-high/20 p-5 text-sm text-high">
              Failed jobs could not be loaded.
            </p>
          ) : failed.data?.items.length ? (
            failed.data.items.map((job) => (
              <FailedJob
                key={job._id}
                job={job}
                retry={retry}
                dismiss={dismiss}
              />
            ))
          ) : (
            <div className="grid min-h-40 place-items-center rounded-control border border-border bg-surface-alt text-center">
              <div>
                <CheckCircle2 className="mx-auto text-accent" />
                <p className="mt-3 font-bold">No failed jobs</p>
                <p className="mt-1 text-sm text-muted">
                  The review queue is healthy.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
