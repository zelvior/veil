"use client";

import { useEffect, useState } from "react";
import { useProxyStore } from "@/store/proxy-store";
import {
  Plus,
  X,
  Globe,
  Clock,
  Search,
  Sparkles,
  Shield,
  Users,
  Newspaper,
  BookOpen,
  Play,
  Cpu,
  Zap,
  Lock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { faviconFor, hostnameOf } from "@/lib/proxy";
import { UNBLOCK_CATEGORIES, BROWSER_PROFILES, getProfile } from "@/lib/browser-profiles";
import type { Tab } from "@/store/proxy-store";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Search,
  Users,
  Newspaper,
  BookOpen,
  Play,
  Cpu,
};

const SUGGESTED = [
  { url: "https://en.wikipedia.org", title: "Wikipedia", color: "#0a0a0a" },
  { url: "https://www.bing.com", title: "Bing", color: "#0078d4" },
  { url: "https://duckduckgo.com", title: "DuckDuckGo", color: "#de5833" },
  { url: "https://news.ycombinator.com", title: "Hacker News", color: "#ff6600" },
  { url: "https://github.com", title: "GitHub", color: "#181717" },
  { url: "https://www.reddit.com", title: "Reddit", color: "#ff4500" },
  { url: "https://stackoverflow.com", title: "Stack Overflow", color: "#f48024" },
  { url: "https://www.bbc.com/news", title: "BBC News", color: "#bb1919" },
];

export function NewTabPageContent({ tab }: { tab: Tab }) {
  const navigate = useProxyStore((s) => s.navigate);
  const quickLinks = useProxyStore((s) => s.quickLinks);
  const addQuickLink = useProxyStore((s) => s.addQuickLink);
  const removeQuickLink = useProxyStore((s) => s.removeQuickLink);
  const history = useProxyStore((s) => s.history);
  const browserProfile = useProxyStore((s) => s.settings.browserProfile);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    "Search"
  );

  const profile = getProfile(browserProfile);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(tab.id, query);
  };

  const quickLinksList = quickLinks.length
    ? quickLinks
    : SUGGESTED.map((s, i) => ({
        id: `sug-${i}`,
        url: s.url,
        title: s.title,
        icon: null,
        color: s.color,
      }));

  const recent = history.slice(0, 6);

  return (
    <div className="min-h-full w-full px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        {/* Hero — Unblocker */}
        <div className="text-center mb-8">
          {/* Veil Logo */}
          <div className="mb-5 flex justify-center">
            <img
              src="/logo.png"
              alt="Veil Logo"
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl shadow-md object-contain bg-white"
            />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-4">
            <Shield className="h-3.5 w-3.5" />
            Website Unblocker
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            Unblock any website
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Enter a URL below to bypass restrictions and browse privately.
            Your request is fetched server-side and rendered through the proxy.
          </p>
        </div>

        {/* Unblock search bar */}
        <form onSubmit={handleSubmit} className="relative mx-auto max-w-2xl mb-3 group">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter a website URL to unblock  (e.g. wikipedia.org)"
            autoFocus
            className="h-14 pl-12 pr-32 rounded-2xl text-base shadow-md border-2 border-transparent focus-visible:border-emerald-500/40 focus-visible:ring-emerald-500/20 bg-white dark:bg-zinc-900"
          />
          <Button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 rounded-xl px-5 bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <Zap className="h-4 w-4 mr-1.5" />
            Unblock
          </Button>
        </form>
        <p className="text-center text-[11px] text-muted-foreground mb-10">
          Browsing as <span className="font-medium text-foreground/80">{profile.label}</span> ·
          cookies &amp; sessions preserved · change profile in Settings
        </p>

        {/* Unblock categories */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Globe className="h-4 w-4" /> Popular Sites to Unblock
          </h2>
          <div className="space-y-2">
            {UNBLOCK_CATEGORIES.map((cat) => {
              const Icon = ICON_MAP[cat.icon] ?? Globe;
              const isOpen = expandedCategory === cat.name;
              return (
                <div
                  key={cat.name}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedCategory(isOpen ? null : cat.name)
                    }
                    className="flex w-full items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-medium text-sm flex-1 text-left">
                      {cat.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {cat.sites.length} sites
                    </span>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 pt-0">
                      {cat.sites.map((site) => (
                        <button
                          key={site.url}
                          onClick={() => navigate(tab.id, site.url)}
                          className="group flex items-center gap-2.5 rounded-lg border border-border bg-background hover:bg-accent hover:border-emerald-500/30 transition-all p-2.5 text-left"
                        >
                          <img
                            src={faviconFor(site.url)}
                            alt=""
                            className="h-5 w-5 rounded-sm flex-shrink-0"
                            onError={(e) =>
                              ((e.target as HTMLImageElement).style.visibility =
                                "hidden")
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">
                              {site.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {hostnameOf(site.url)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick links */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Quick Links
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAddOpen(true)}
              className="text-xs h-7"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
            {quickLinksList.map((link) => (
              <QuickLinkTile
                key={link.id}
                url={link.url}
                title={link.title}
                color={link.color}
                onDelete={
                  quickLinks.length
                    ? () => {
                        fetch(`/api/quicklinks?id=${link.id}`, {
                          method: "DELETE",
                        });
                        removeQuickLink(link.id);
                      }
                    : undefined
                }
                onClick={() => navigate(tab.id, link.url)}
              />
            ))}
          </div>
        </div>

        {/* Recently visited */}
        {recent.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Recently Visited
            </h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {recent.map((h) => (
                <button
                  key={h.id}
                  onClick={() => navigate(tab.id, h.url)}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors p-3 text-left"
                >
                  <img
                    src={h.favicon || faviconFor(h.url)}
                    alt=""
                    className="h-5 w-5 rounded-sm flex-shrink-0"
                    onError={(e) =>
                      ((e.target as HTMLImageElement).style.visibility =
                        "hidden")
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {h.title || hostnameOf(h.url)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {hostnameOf(h.url)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer hint */}
        <div className="mt-12 text-center space-y-3">
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            Press{" "}
            <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">
              Ctrl
            </kbd>
            <span>+</span>
            <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">
              K
            </kbd>
            for the command palette
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/70">
            <a href="/legal/about" className="hover:text-emerald-600 dark:hover:text-emerald-400">About</a>
            <span className="text-muted-foreground/30">·</span>
            <a href="/legal/privacy" className="hover:text-emerald-600 dark:hover:text-emerald-400">Privacy</a>
            <span className="text-muted-foreground/30">·</span>
            <a href="/legal/terms" className="hover:text-emerald-600 dark:hover:text-emerald-400">Terms</a>
            <span className="text-muted-foreground/30">·</span>
            <a href="/legal/cookies" className="hover:text-emerald-600 dark:hover:text-emerald-400">Cookies</a>
            <span className="text-muted-foreground/30">·</span>
            <a href="/legal/disclaimer" className="hover:text-emerald-600 dark:hover:text-emerald-400">Disclaimer</a>
            <span className="text-muted-foreground/30">·</span>
            <a href="/legal/contact" className="hover:text-emerald-600 dark:hover:text-emerald-400">Contact</a>
          </div>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Quick Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ql-url">URL</Label>
              <Input
                id="ql-url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ql-title">Title</Label>
              <Input
                id="ql-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Example"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!newUrl || !newTitle) return;
                const res = await fetch("/api/quicklinks", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ url: newUrl, title: newTitle }),
                });
                const data = await res.json();
                if (data.item) addQuickLink(data.item);
                setNewUrl("");
                setNewTitle("");
                setAddOpen(false);
              }}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuickLinkTile({
  url,
  title,
  color,
  onDelete,
  onClick,
}: {
  url: string;
  title: string;
  color?: string | null;
  onDelete?: () => void;
  onClick: () => void;
}) {
  const initial = title.charAt(0).toUpperCase();
  return (
    <div className="group relative">
      <button
        onClick={onClick}
        className="flex w-full flex-col items-center gap-2 rounded-xl p-3 transition-all hover:bg-accent hover:-translate-y-0.5 hover:shadow-sm"
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white shadow-sm overflow-hidden"
          style={{ background: color || "#10b981" }}
        >
          {color ? (
            initial
          ) : (
            <img
              src={faviconFor(url)}
              alt=""
              className="h-7 w-7"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
        </div>
        <span className="text-xs font-medium text-center truncate w-full">
          {title}
        </span>
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          aria-label="Remove"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
