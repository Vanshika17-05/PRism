import { useEffect, useState } from "react";
import { Command } from "cmdk";
import {
  Github,
  GitPullRequest,
  LayoutDashboard,
  LogOut,
  Moon,
  Search,
  Settings,
  Sun,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useReviews } from "@/hooks/useReviews";
import { useGithubAppInstall } from "@/hooks/useGithubAppInstall";

const navigation = [
  ["Overview", "/dashboard/overview", LayoutDashboard],
  ["Reviews", "/dashboard/reviews", GitPullRequest],
  ["Repos", "/dashboard/repos", Github],
  ["Settings", "/dashboard/settings", Settings],
  ["Profile", "/dashboard/settings/profile", UserRound],
];

export function CommandPalette({ theme, toggleTheme, signOut }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const reviews = useReviews({ page: 1 });
  const {
    connectRepository,
    installUrl,
    error: installError,
  } = useGithubAppInstall();
  const shortcut =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.platform)
      ? "⌘K"
      : "Ctrl K";

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function run(action) {
    setOpen(false);
    action();
  }

  return (
    <>
      <button
        type="button"
        className="clay-control hidden items-center gap-2 px-3 py-2 text-xs font-bold text-muted lg:inline-flex"
        onClick={() => setOpen(true)}
        aria-label={`Open command palette, ${shortcut}`}
      >
        <Search size={14} /> Search
        <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-sans text-[10px] text-primary">
          {shortcut}
        </kbd>
      </button>
      <button
        type="button"
        className="clay-icon lg:hidden"
        onClick={() => setOpen(true)}
        aria-label={`Open command palette, ${shortcut}`}
      >
        <Search size={17} />
      </button>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="PRism command palette"
        loop
        className="command-palette"
      >
        <div className="flex items-center gap-3 border-b border-border px-5">
          <Search size={18} className="shrink-0 text-accent" />
          <Command.Input
            autoFocus
            className="h-14 min-w-0 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-muted"
            placeholder="Search pages, reviews, and actions…"
          />
          <kbd className="clay-badge text-[10px]">Esc</kbd>
        </div>
        <Command.List className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
          <Command.Empty className="px-4 py-10 text-center text-sm text-muted">
            No matching command or review.
          </Command.Empty>
          <Command.Group heading="Navigate">
            {navigation.map(([label, path, Icon]) => (
              <Command.Item
                key={path}
                value={`navigate ${label}`}
                onSelect={() => run(() => navigate(path))}
              >
                <Icon size={17} />
                <span>{label}</span>
              </Command.Item>
            ))}
          </Command.Group>
          {!!reviews.data?.items?.length && (
            <Command.Group heading="Search reviews">
              {reviews.data.items.slice(0, 12).map((review) => (
                <Command.Item
                  key={review._id}
                  value={`review ${review.prTitle} ${review.repository?.fullName || ""} ${review.prNumber}`}
                  keywords={[review.prTitle, review.repository?.fullName || ""]}
                  onSelect={() =>
                    run(() => navigate(`/dashboard/reviews/${review._id}`))
                  }
                >
                  <GitPullRequest size={17} />
                  <span className="min-w-0 flex-1 truncate">
                    {review.prTitle}
                  </span>
                  <span className="text-xs text-muted">#{review.prNumber}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
          {reviews.isError && (
            <Command.Group heading="Search reviews">
              <Command.Item disabled value="reviews unavailable">
                <GitPullRequest size={17} />
                <span>Recent reviews are temporarily unavailable</span>
              </Command.Item>
            </Command.Group>
          )}
          <Command.Group heading="Actions">
            <Command.Item
              value="action connect repository github install"
              disabled={!installUrl}
              onSelect={() => run(connectRepository)}
            >
              <Github size={17} />
              <span>Connect a repository</span>
              {installError && (
                <span className="ml-auto text-xs">Unavailable</span>
              )}
            </Command.Item>
            <Command.Item
              value="action toggle dark light theme"
              onSelect={() => run(toggleTheme)}
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
              <span>Toggle dark/light mode</span>
            </Command.Item>
            <Command.Item
              value="action sign out logout"
              onSelect={() => run(signOut)}
            >
              <LogOut size={17} />
              <span>Sign out</span>
            </Command.Item>
          </Command.Group>
        </Command.List>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[10px] text-muted">
          <span>↑↓ Navigate</span>
          <span>Enter Select</span>
        </div>
      </Command.Dialog>
    </>
  );
}
