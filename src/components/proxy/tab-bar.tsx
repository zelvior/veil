"use client";

import { useProxyStore } from "@/store/proxy-store";
import { Plus, X, Globe, Loader2, Incognito } from "@/components/icons";
import { cn } from "@/lib/utils";
import { hostnameOf } from "@/lib/proxy";

export function TabBar() {
  const tabs = useProxyStore((s) => s.tabs);
  const activeId = useProxyStore((s) => s.activeId);
  const activateTab = useProxyStore((s) => s.activateTab);
  const closeTab = useProxyStore((s) => s.closeTab);
  const newTab = useProxyStore((s) => s.newTab);

  return (
    <div className="flex items-end gap-1 px-2 pt-1.5 bg-zinc-100 dark:bg-zinc-900 border-b border-border overflow-x-auto scrollbar-thin">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <div
            key={tab.id}
            onClick={() => activateTab(tab.id)}
            className={cn(
              "group relative flex h-9 min-w-[140px] max-w-[220px] cursor-pointer items-center gap-2 rounded-t-lg px-3 text-sm transition-colors",
              active
                ? "bg-white dark:bg-zinc-950 text-foreground shadow-sm"
                : "bg-zinc-200/60 dark:bg-zinc-800/60 text-muted-foreground hover:bg-zinc-200 dark:hover:bg-zinc-800"
            )}
          >
            {tab.incognito ? (
              <Incognito className="h-3.5 w-3.5 flex-shrink-0 text-violet-500" />
            ) : tab.loading ? (
              <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-emerald-500" />
            ) : tab.favicon ? (
              <img
                src={tab.favicon}
                alt=""
                className="h-4 w-4 flex-shrink-0 rounded-sm"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
            ) : (
              <Globe className="h-3.5 w-3.5 flex-shrink-0" />
            )}
            <span className="flex-1 truncate text-xs font-medium">
              {tab.url ? tab.title || hostnameOf(tab.url) : "New Tab"}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className={cn(
                "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-colors",
                "hover:bg-zinc-300 dark:hover:bg-zinc-700",
                active ? "opacity-70" : "opacity-0 group-hover:opacity-70"
              )}
              aria-label="Close tab"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
      <button
        onClick={() => newTab()}
        className="mb-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-foreground"
        aria-label="New tab"
        title="New tab (Ctrl+T)"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
