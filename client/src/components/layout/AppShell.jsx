import {
  LayoutDashboard,
  GitPullRequest,
  Github,
  Settings,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { MorphingTabs } from "@/components/effects/MorphingTabs";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { CommandPalette } from "@/components/layout/CommandPalette";

const baseItems = [
  {
    value: "/dashboard/overview",
    label: "Overview",
    icon: <LayoutDashboard size={17} />,
  },
  {
    value: "/dashboard/reviews",
    label: "Reviews",
    icon: <GitPullRequest size={17} />,
  },
  { value: "/dashboard/repos", label: "Repos", icon: <Github size={17} /> },
  {
    value: "/dashboard/settings",
    label: "Settings",
    icon: <Settings size={17} />,
  },
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <span className="logo-mark">
        <i />
        <i />
      </span>
      <div>
        <div className="text-lg font-extrabold tracking-[-.04em]">
          PRism<span className="text-accent">.</span>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-muted">
          Review intelligence
        </p>
      </div>
    </div>
  );
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const {
    organizations,
    current: currentOrg,
    role,
    switchOrganization,
  } = useOrganization();
  const failedJobs = useQuery({
    queryKey: ["failed-reviews"],
    queryFn: async () => (await api.get("/api/failed-reviews?limit=1")).data,
    refetchInterval: 15_000,
  });
  const items = baseItems.map((item) =>
    item.value === "/dashboard/settings"
      ? { ...item, badge: failedJobs.data?.pagination.total || 0 }
      : item,
  );
  const currentNav =
    items.find((item) => location.pathname.startsWith(item.value))?.value ||
    items[0].value;
  const health = useQuery({
    queryKey: ["health"],
    queryFn: async () => (await api.get("/api/health")).data,
    retry: 0,
    refetchInterval: 30_000,
  });
  const signOut = async () => {
    await logout();
    navigate("/login");
  };
  return (
    <div className="min-h-screen bg-bg text-primary md:flex">
      <aside className="sidebar fixed inset-y-0 left-0 z-30 hidden w-64 flex-col px-5 py-7 md:flex">
        <Logo />
        {organizations.length > 1 ? (
          <select
            className="clay-input mt-6 text-xs"
            value={currentOrg?._id || ""}
            onChange={(event) => switchOrganization(event.target.value)}
            aria-label="Organization"
          >
            {organizations.map((org) => (
              <option key={org._id} value={org._id}>
                {org.name}
              </option>
            ))}
          </select>
        ) : currentOrg ? (
          <div className="clay-control mt-6 px-3 py-2 text-xs font-bold">
            {currentOrg.name}
            <span className="ml-2 text-muted">· {role}</span>
          </div>
        ) : null}
        <div className="mt-12 text-[10px] font-bold uppercase tracking-[.2em] text-muted">
          Workspace
        </div>
        <MorphingTabs
          items={items}
          value={currentNav}
          onChange={navigate}
          layoutId="desktop-nav-pill"
          className="mt-3 flex-col items-stretch border-0 bg-transparent p-0 shadow-none [&>button]:w-full"
        />
      </aside>
      <div className="min-w-0 flex-1 md:ml-64">
        <header className="topbar sticky top-0 z-20 flex h-16 items-center justify-between px-5 md:px-8">
          <div className="md:hidden">
            <Logo />
          </div>
          <div className="hidden text-sm text-muted md:block">
            Welcome back,{" "}
            <b className="text-primary">
              {user?.displayName || user?.name || user?.username}
            </b>{" "}
            <span className="ml-2">· {currentOrg?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <CommandPalette
              theme={theme}
              toggleTheme={toggleTheme}
              signOut={signOut}
            />
            <img
              className="clay-control hidden size-10 rounded-full object-cover p-1 sm:block"
              src={
                user?.avatarUrl ||
                user?.githubAvatarUrl ||
                `https://github.com/${user?.username}.png`
              }
              alt={
                user?.displayName || user?.name || user?.username || "Profile"
              }
            />
            <span className="clay-badge hidden items-center gap-2 sm:inline-flex">
              <i
                className={`size-2 rounded-full ${health.isSuccess ? "bg-accent shadow-[0_0_12px_var(--accent-glow)]" : "bg-medium"}`}
              />{" "}
              {health.isSuccess
                ? "API connected"
                : health.isLoading
                  ? "Checking API"
                  : "API offline"}
            </span>
            <button
              className="clay-icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <button
              className="clay-icon"
              onClick={signOut}
              aria-label="Sign out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] px-5 pb-28 pt-7 md:px-8 md:pb-10 md:pt-9">
          <Outlet />
        </main>
      </div>
      <nav className="fixed inset-x-3 bottom-3 z-40 md:hidden">
        <MorphingTabs
          items={items}
          value={currentNav}
          onChange={navigate}
          layoutId="mobile-nav-pill"
          className="justify-between overflow-x-auto [&>button]:flex-1 [&>button]:flex-col [&>button]:gap-1 [&>button]:px-2 [&>button]:py-1.5 [&>button]:text-[10px]"
        />
      </nav>
    </div>
  );
}
