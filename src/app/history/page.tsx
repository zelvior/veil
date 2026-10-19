"use client";

import { useEffect, useState, useMemo } from "react";
import { useProxyStore } from "@/store/proxy-store";
import { faviconFor, hostnameOf } from "@/lib/proxy";
import { LegalLayout } from "@/components/legal/legal-layout";
import { historyDB } from "@/lib/indexeddb";
import { Search, Trash2, Clock, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function HistoryPage() {
  const history = useProxyStore((s) => s.history);
  const setHistory = useProxyStore((s) => s.setHistory);
  const { toast } = useToast();
  const [query, setQuery] = useState("");

  // Load fresh history from IndexedDB.
  useEffect(() => {
    historyDB.getAll(1000).then((items) => {
      setHistory(
        items.map((h) => ({
          id: h.id,
          url: h.url,
          title: h.title,
          favicon: h.favicon,
          visitedAt: new Date(h.visitedAt).toISOString(),
        }))
      );
    }).catch(() => {});
  }, [setHistory]);

  const filtered = useMemo(() => {
    if (!query) return history;
    const q = query.toLowerCase();
    return history.filter(
      (h) =>
        h.url.toLowerCase().includes(q) ||
        (h.title || "").toLowerCase().includes(q)
    );
  }, [history, query]);

  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  const deleteItem = async (id: string) => {
    await historyDB.delete(id);
    setHistory(history.filter((h) => h.id !== id));
  };

  const clearAll = async () => {
    await historyDB.clearAll();
    setHistory([]);
    toast({ title: "All history cleared" });
  };

  return (
    <LegalLayout title="Browsing History" lastUpdated="Live">
      <div className="not-prose space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search history…"
            className="pl-10 pr-10"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
          </p>
          {history.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAll}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear all
            </Button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">
              {query ? "No matching entries" : "No browsing history yet"}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {query ? "Try a different search term" : "Pages you visit will appear here"}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([day, items]) => (
              <div key={day}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                  {day}
                </h3>
                <div className="space-y-1">
                  {items.map((h) => (
                    <div
                      key={h.id}
                      className="group flex items-center gap-3 rounded-lg p-2 hover:bg-accent transition-colors"
                    >
                      <img
                        src={h.favicon || faviconFor(h.url)}
                        alt=""
                        className="h-4 w-4 rounded-sm flex-shrink-0"
                        onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{h.title || hostnameOf(h.url)}</p>
                        <p className="text-xs text-muted-foreground truncate">{hostnameOf(h.url)}</p>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                        {new Date(h.visitedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <button
                        onClick={() => deleteItem(h.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all"
                        title="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </LegalLayout>
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
    else if (t >= weekAgo) label = new Date(it.visitedAt).toLocaleDateString([], { weekday: "long" });
    else label = new Date(it.visitedAt).toLocaleDateString([], { month: "short", day: "numeric" });
    if (!buckets[label]) buckets[label] = [];
    buckets[label].push(it);
  }
  return Object.entries(buckets);
}
