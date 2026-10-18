"use client";

import { useEffect, useState } from "react";
import { useProxyStore } from "@/store/proxy-store";
import { faviconFor, hostnameOf } from "@/lib/proxy";
import {
  X,
  History as HistoryIcon,
  Bookmark,
  Trash2,
  Search,
  ExternalLink,
  Clock,
} from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function Sidebar() {
  const open = useProxyStore((s) => s.sidebarOpen);
  const panel = useProxyStore((s) => s.sidebarPanel);
  const setSidebar = useProxyStore((s) => s.setSidebar);
  const history = useProxyStore((s) => s.history);
  const bookmarks = useProxyStore((s) => s.bookmarks);
  const setHistory = useProxyStore((s) => s.setHistory);
  const removeBookmark = useProxyStore((s) => s.removeBookmark);
  const tabs = useProxyStore((s) => s.tabs);
  const activeId = useProxyStore((s) => s.activeId);
  const tab = tabs.find((t) => t.id === activeId) || tabs[0];
  const navigate = useProxyStore((s) => s.navigate);
  const { toast } = useToast();
  const [query, setQuery] = useState("");

  if (!open || !panel) return null;

  const close = () => setSidebar(false, null);

  const filteredHistory = history.filter(
    (h) =>
      !query ||
      h.url.toLowerCase().includes(query.toLowerCase()) ||
      (h.title || "").toLowerCase().includes(query.toLowerCase())
  );

  // Group history by day
  const grouped = groupByDay(filteredHistory);

  const clearAllHistory = async () => {
    await fetch("/api/history?all=1", { method: "DELETE" });
    setHistory([]);
    toast({ title: "History cleared" });
  };

  return (
    <div className="flex h-full w-[300px] flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          {panel === "history" ? (
            <HistoryIcon className="h-4 w-4 text-emerald-500" />
          ) : (
            <Bookmark className="h-4 w-4 text-amber-500" />
          )}
          <span className="text-sm font-semibold">
            {panel === "history" ? "History" : "Bookmarks"}
          </span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {panel === "history" ? history.length : bookmarks.length}
          </span>
        </div>
        <button
          onClick={close}
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-border p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={panel === "history" ? "Search history" : "Search bookmarks"}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {panel === "history" ? (
          grouped.length === 0 ? (
            <EmptyState
              icon={<HistoryIcon className="h-8 w-8" />}
              title="No history yet"
              subtitle="Pages you visit will appear here"
            />
          ) : (
            grouped.map(([label, items]) => (
              <div key={label} className="py-1">
                <div className="sticky top-0 z-10 bg-card px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </div>
                {items.map((h) => (
                  <HistoryRow
                    key={h.id}
                    item={h}
                    onOpen={() => tab && navigate(tab.id, h.url)}
                    onDelete={async () => {
                      await fetch(`/api/history?id=${h.id}`, { method: "DELETE" });
                      setHistory(history.filter((x) => x.id !== h.id));
                    }}
                  />
                ))}
              </div>
            ))
          )
        ) : bookmarks.length === 0 ? (
          <EmptyState
            icon={<Bookmark className="h-8 w-8" />}
            title="No bookmarks yet"
            subtitle="Click the star in the address bar to save pages"
          />
        ) : (
          bookmarks
            .filter(
              (b) =>
                !query ||
                b.url.toLowerCase().includes(query.toLowerCase()) ||
                b.title.toLowerCase().includes(query.toLowerCase())
            )
            .map((b) => (
              <HistoryRow
                key={b.id}
                item={{ ...b, visitedAt: new Date().toISOString() }}
                onOpen={() => tab && navigate(tab.id, b.url)}
                onDelete={async () => {
                  await fetch(`/api/bookmarks?id=${b.id}`, { method: "DELETE" });
                  removeBookmark(b.id);
                }}
              />
            ))
        )}
      </div>

      {/* Footer */}
      {panel === "history" && history.length > 0 && (
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllHistory}
            className="w-full justify-start text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Clear all history
          </Button>
        </div>
      )}
    </div>
  );
}

function HistoryRow({
  item,
  onOpen,
  onDelete,
}: {
  item: {
    id: string;
    url: string;
    title: string;
    favicon: string | null;
    visitedAt: string;
  };
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-1.5 transition-colors cursor-pointer hover:bg-accent"
      )}
      onClick={onOpen}
    >
      <img
        src={item.favicon || faviconFor(item.url)}
        alt=""
        className="h-4 w-4 flex-shrink-0 rounded-sm"
        onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">
          {item.title || hostnameOf(item.url)}
        </p>
        <p className="truncate text-[10px] text-muted-foreground">
          {hostnameOf(item.url)}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="hidden h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive hover:text-destructive-foreground group-hover:flex"
        aria-label="Delete"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="text-muted-foreground/40">{icon}</div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground/70">{subtitle}</p>
    </div>
  );
}

function groupByDay(items: { id: string; visitedAt: string; url: string; title: string; favicon: string | null }[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const weekAgo = today - 7 * 86400000;

  const buckets: Record<string, typeof items> = {};
  for (const it of items) {
    const t = new Date(it.visitedAt).getTime();
    let label: string;
    if (t >= today) label = "Today";
    else if (t >= yesterday) label = "Yesterday";
    else if (t >= weekAgo) {
      label = new Date(it.visitedAt).toLocaleDateString([], { weekday: "long" });
    } else {
      label = new Date(it.visitedAt).toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: t < new Date(now.getFullYear(), 0, 1).getTime() ? "numeric" : undefined,
      });
    }
    if (!buckets[label]) buckets[label] = [];
    buckets[label].push(it);
  }
  return Object.entries(buckets);
}
