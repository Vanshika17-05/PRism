import { useState } from "react";
import { LayoutDashboard, GitPullRequest, Github, Settings, SlidersHorizontal } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { MorphingTabs } from "@/components/effects/MorphingTabs";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const items = [
  { value: "/", label: "Overview", icon: <LayoutDashboard size={17} /> },
  { value: "/reviews", label: "Reviews", icon: <GitPullRequest size={17} /> },
  { value: "/repos", label: "Repos", icon: <Github size={17} /> },
  { value: "/settings", label: "Settings", icon: <Settings size={17} /> }
];

function Logo() { return <div className="flex items-center gap-3"><span className="logo-mark"><i /><i /></span><div><div className="text-lg font-extrabold tracking-[-.04em]">PRism<span className="text-accent">.</span></div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-muted">Review intelligence</p></div></div>; }

export function AppShell() {
  const location = useLocation(); const navigate = useNavigate(); const current = location.pathname === "/" ? "/" : items.find((item) => location.pathname.startsWith(item.value))?.value || "/";
  const health = useQuery({ queryKey: ["health"], queryFn: async () => (await api.get("/api/health")).data, retry: 0, refetchInterval: 30_000 });
  return <div className="min-h-screen bg-bg text-primary md:flex">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-white/65 px-5 py-7 backdrop-blur-2xl md:flex"><Logo /><div className="mt-12 text-[10px] font-bold uppercase tracking-[.2em] text-muted">Workspace</div><MorphingTabs items={items} value={current} onChange={navigate} layoutId="desktop-nav-pill" className="mt-3 flex-col items-stretch border-0 bg-transparent p-0 [&>button]:w-full" /><div className="mt-auto rounded-card border border-border bg-surface p-4"><div className="flex items-center gap-2 text-xs font-semibold"><SlidersHorizontal size={14} className="text-accent" /> Local-first review</div><p className="mt-2 text-xs leading-relaxed text-muted">Your code is analyzed by Ollama on infrastructure you control.</p></div></aside>
    <div className="min-w-0 flex-1 md:ml-64"><header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-white/65 px-5 backdrop-blur-2xl md:px-8"><div className="md:hidden"><Logo /></div><div className="hidden text-sm text-muted md:block">PRism workspace</div><span className="inline-flex items-center gap-2 rounded-full border border-border bg-white/75 px-3 py-1.5 text-xs font-semibold"><i className={`size-2 rounded-full ${health.isSuccess ? "bg-accent shadow-[0_0_12px_var(--accent-glow)]" : "bg-medium"}`} /> {health.isSuccess ? "API connected" : health.isLoading ? "Checking API" : "API offline"}</span></header><main className="mx-auto max-w-[1500px] px-5 pb-28 pt-7 md:px-8 md:pb-10 md:pt-9"><Outlet /></main></div>
    <nav className="fixed inset-x-3 bottom-3 z-40 md:hidden"><MorphingTabs items={items} value={current} onChange={navigate} layoutId="mobile-nav-pill" className="justify-between overflow-x-auto bg-white/85 shadow-glass backdrop-blur-2xl [&>button]:flex-1 [&>button]:flex-col [&>button]:gap-1 [&>button]:px-2 [&>button]:py-1.5 [&>button]:text-[10px]" /></nav>
  </div>;
}
