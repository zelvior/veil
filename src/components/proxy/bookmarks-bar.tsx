"use client";

import { useProxyStore } from "@/store/proxy-store";
import { Bookmark as BookmarkIcon, X } from "@/components/icons";
import { faviconFor, hostnameOf } from "@/lib/proxy";
import { cn } from "@/lib/utils";
import { deleteBookmark } from "@/hooks/use-indexeddb-sync";

export function BookmarksBar() {
  const bookmarks = useProxyStore((s) => s.bookmarks);
  const tabs = useProxyStore((s) => s.tabs);
  const activeId = useProxyStore((s) => s.activeId);
  const tab = tabs.find((t) => t.id === activeId) || tabs[0];
  const navigate = useProxyStore((s) => s.navigate);
  const removeBookmark = useProxyStore((s) => s.removeBookmark);
  const visible = useProxyStore((s) => s.settings.showBookmarksBar);

  if (!visible) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-muted/40 dark:bg-zinc-900/50 border-b border-border overflow-x-auto scrollbar-thin">
      {bookmarks.length === 0 ? (
        <span className="text-xs text-muted-foreground/70 px-2 flex items-center gap-1.5">
          <BookmarkIcon className="h-3.5 w-3.5" />
          Bookmarks you save appear here
        </span>
      ) : (
        bookmarks.map((b) => (
          <div
            key={b.id}
            className={cn(
              "group flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
              "hover:bg-accent cursor-default flex-shrink-0"
            )}
            onClick={() => tab && navigate(tab.id, b.url)}
            role="button"
            title={b.url}
          >
            <img
              src={b.favicon || faviconFor(b.url)}
              alt=""
              className="h-4 w-4 rounded-sm flex-shrink-0"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
            <span className="max-w-[120px] truncate">{b.title || hostnameOf(b.url)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteBookmark(b.id);
                removeBookmark(b.id);
              }}
              className="ml-0.5 hidden h-4 w-4 items-center justify-center rounded group-hover:flex hover:bg-destructive hover:text-destructive-foreground"
              aria-label="Remove bookmark"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))
      )}
    </div>
  );
}
