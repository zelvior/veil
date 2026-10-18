"use client";

import { useEffect, useState } from "react";
import { useProxyStore } from "@/store/proxy-store";
import { Plus, X, Globe, Clock, Search, Sparkles } from "lucide-react";
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
import type { Tab } from "@/store/proxy-store";

const SUGGESTED = [
  { url: "https://en.wikipedia.org", title: "Wikipedia", color: "#0a0a0a" },
  { url: "https://www.bing.com", title: "Bing", color: "#0078d4" },
  { url: "https://duckduckgo.com", title: "DuckDuckGo", color: "#de5833" },
  { url: "https://news.ycombinator.com", title: "Hacker News", color: "#ff6600" },
  { url: "https://github.com", title: "GitHub", color: "#181717" },
  { url: "https://www.reddit.com", title: "Reddit", color: "#ff4500" },
  { url: "https://stackoverflow.com", title: "Stack Overflow", color: "#f48024" },
  { url: "https://www.bbc.com/news", title: "BBC News", color: "#bb1919" },
  { url: "https://www.theguardian.com", title: "The Guardian", color: "#052962" },
  { url: "https://lite.duckduckgo.com", title: "DDG Lite", color: "#de5833" },
];

export function NewTabPageContent({ tab }: { tab: Tab }) {
  const navigate = useProxyStore((s) => s.navigate);
  const quickLinks = useProxyStore((s) => s.quickLinks);
  const addQuickLink = useProxyStore((s) => s.addQuickLink);
  const removeQuickLink = useProxyStore((s) => s.removeQuickLink);
  const history = useProxyStore((s) => s.history);
  const [query, setQuery] = useState("");
  const [time, setTime] = useState(new Date());
  const [addOpen, setAddOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(tab.id, query);
  };

  const quickLinksList = quickLinks.length ? quickLinks : SUGGESTED.map((s, i) => ({
    id: `sug-${i}`,
    url: s.url,
    title: s.title,
    icon: null,
    color: s.color,
  }));

  const recent = history.slice(0, 6);

  return (
    <div className="min-h-full w-full px-4 py-10 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-4xl">
        {/* Clock + Greeting */}
        <div className="text-center mb-8">
          <div className="text-5xl sm:text-6xl font-bold tracking-tight tabular-nums">
            {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          <p className="mt-2 text-muted-foreground text-sm">
            {greeting()} — browse the web privately through the proxy
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSubmit} className="relative mx-auto max-w-2xl mb-10 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the web or enter a URL"
            autoFocus
            className="h-14 pl-12 pr-4 rounded-full text-base shadow-sm border-2 border-transparent focus-visible:border-emerald-500/40 focus-visible:ring-emerald-500/20 bg-white dark:bg-zinc-900"
          />
        </form>

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
                        fetch(`/api/quicklinks?id=${link.id}`, { method: "DELETE" });
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
                    onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {h.title || hostnameOf(h.url)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{hostnameOf(h.url)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer hint */}
        <div className="mt-12 text-center">
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            Press <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">Ctrl</kbd>
            <span>+</span>
            <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">K</kbd>
            for the command palette
          </p>
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

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
