"use client";

import { useMemo, useState } from "react";
import { useProxyStore, SEARCH_ENGINES } from "@/store/proxy-store";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Globe, History, Bookmark, Plus, Settings, RotateCw } from "@/components/icons";
import { faviconFor, hostnameOf } from "@/lib/proxy";
import { cn } from "@/lib/utils";

export function CommandPalette() {
  const open = useProxyStore((s) => s.paletteOpen);
  const close = useProxyStore((s) => s.closePalette);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="p-0 gap-0 max-w-xl overflow-hidden rounded-2xl" showCloseButton={false} aria-describedby={undefined}>
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        {open ? <PaletteBody onDone={close} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function PaletteBody({ onDone }: { onDone: () => void }) {
  const history = useProxyStore((s) => s.history);
  const bookmarks = useProxyStore((s) => s.bookmarks);
  const tabs = useProxyStore((s) => s.tabs);
  const activeId = useProxyStore((s) => s.activeId);
  const tab = tabs.find((t) => t.id === activeId) || tabs[0];
  const navigate = useProxyStore((s) => s.navigate);
  const newTab = useProxyStore((s) => s.newTab);
  const openSettings = useProxyStore((s) => s.openSettings);
  const reload = useProxyStore((s) => s.reload);
  const toggleSidebar = useProxyStore((s) => s.toggleSidebar);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  const updateQuery = (v: string) => {
    setQuery(v);
    setSelected(0);
  };

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list: PaletteItem[] = [];

    // Actions
    list.push({
      id: "new-tab",
      kind: "action",
      title: "New tab",
      subtitle: "Open a fresh tab",
      icon: <Plus className="h-4 w-4" />,
      run: () => newTab(),
    });
    list.push({
      id: "new-incognito",
      kind: "action",
      title: "New incognito tab",
      subtitle: "Browse without saving history",
      icon: <Plus className="h-4 w-4" />,
      run: () => newTab(undefined, true),
    });
    if (tab?.url) {
      list.push({
        id: "reload",
        kind: "action",
        title: "Reload current page",
        subtitle: hostnameOf(tab.url),
        icon: <RotateCw className="h-4 w-4" />,
        run: () => reload(tab.id),
      });
    }
    list.push({
      id: "settings",
      kind: "action",
      title: "Open settings",
      subtitle: "Search engine, theme, privacy",
      icon: <Settings className="h-4 w-4" />,
      run: () => openSettings(),
    });
    list.push({
      id: "history-panel",
      kind: "action",
      title: "Open history panel",
      subtitle: `${history.length} entries`,
      icon: <History className="h-4 w-4" />,
      run: () => toggleSidebar("history"),
    });
    list.push({
      id: "bookmarks-panel",
      kind: "action",
      title: "Open bookmarks panel",
      subtitle: `${bookmarks.length} saved`,
      icon: <Bookmark className="h-4 w-4" />,
      run: () => toggleSidebar("bookmarks"),
    });

    // Search engines
    Object.entries(SEARCH_ENGINES).forEach(([name, url]) => {
      list.push({
        id: `se-${name}`,
        kind: "search-engine",
        title: `Search with ${name}`,
        subtitle: q ? `for "${q}"` : "set as default in settings",
        icon: <Globe className="h-4 w-4" />,
        run: () => {
          if (q) {
            navigate(tab.id, url.replace("{q}", encodeURIComponent(q)));
          }
        },
      });
    });

    // If the query looks like a URL, offer to navigate directly
    if (q && /^https?:\/\//i.test(query)) {
      list.unshift({
        id: "goto-url",
        kind: "navigate",
        title: "Go to URL",
        subtitle: query,
        icon: <Globe className="h-4 w-4" />,
        run: () => navigate(tab.id, query),
      });
    } else if (q && /^[\w-]+(\.[\w-]+)+$/.test(query) && !/\s/.test(query)) {
      list.unshift({
        id: "goto-domain",
        kind: "navigate",
        title: "Go to site",
        subtitle: `https://${query}`,
        icon: <Globe className="h-4 w-4" />,
        run: () => navigate(tab.id, `https://${query}`),
      });
    }

    // Bookmarks matches
    bookmarks
      .filter(
        (b) =>
          !q ||
          b.title.toLowerCase().includes(q) ||
          b.url.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .forEach((b) =>
        list.push({
          id: `bm-${b.id}`,
          kind: "bookmark",
          title: b.title,
          subtitle: hostnameOf(b.url),
          icon: (
            <img
              src={b.favicon || faviconFor(b.url)}
              alt=""
              className="h-4 w-4 rounded-sm"
              onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
            />
          ),
          run: () => navigate(tab.id, b.url),
        })
      );

    // History matches
    history
      .filter(
        (h) =>
          !q ||
          h.url.toLowerCase().includes(q) ||
          (h.title || "").toLowerCase().includes(q)
      )
      .slice(0, 5)
      .forEach((h) =>
        list.push({
          id: `hi-${h.id}`,
          kind: "history",
          title: h.title || hostnameOf(h.url),
          subtitle: hostnameOf(h.url),
          icon: (
            <img
              src={h.favicon || faviconFor(h.url)}
              alt=""
              className="h-4 w-4 rounded-sm"
              onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
            />
          ),
          run: () => navigate(tab.id, h.url),
        })
      );

    const filtered = q
      ? list.filter(
          (i) =>
            i.title.toLowerCase().includes(q) ||
            i.subtitle.toLowerCase().includes(q) ||
            i.kind === "navigate" ||
            i.kind === "search-engine"
        )
      : list;
    return filtered;
  }, [query, history, bookmarks, tab, navigate, newTab, openSettings, reload, toggleSidebar]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[selected];
      if (item) {
        item.run();
        onDone();
      }
    } else if (e.key === "Escape") {
      onDone();
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border px-4">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => updateQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder="Search or type a command…"
          className="flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-muted-foreground"
        />
        <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          ESC
        </kbd>
      </div>
      <div className="max-h-[60vh] overflow-y-auto py-2">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No results
          </div>
        ) : (
          items.map((item, idx) => (
            <button
              key={item.id}
              onMouseEnter={() => setSelected(idx)}
              onClick={() => {
                item.run();
                onDone();
              }}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors",
                idx === selected ? "bg-accent" : "hover:bg-accent/50"
              )}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                {item.kind}
              </span>
            </button>
          ))
        )}
      </div>
    </>
  );
}

interface PaletteItem {
  id: string;
  kind: "action" | "navigate" | "bookmark" | "history" | "search-engine";
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  run: () => void;
}
