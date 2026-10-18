"use client";

import { useRef, useState } from "react";
import { useProxyStore } from "@/store/proxy-store";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  House,
  Star,
  StarOff,
  Menu,
  Shield,
  Lock,
  X,
  Globe,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { hostnameOf, faviconFor } from "@/lib/proxy";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function NavigationBar() {
  const tabs = useProxyStore((s) => s.tabs);
  const activeId = useProxyStore((s) => s.activeId);
  const tab = tabs.find((t) => t.id === activeId) || tabs[0];

  const navigate = useProxyStore((s) => s.navigate);
  const reload = useProxyStore((s) => s.reload);
  const goBack = useProxyStore((s) => s.goBack);
  const goForward = useProxyStore((s) => s.goForward);
  const goHome = useProxyStore((s) => s.goHome);
  const canGoBack = useProxyStore((s) => s.canGoBack);
  const canGoForward = useProxyStore((s) => s.canGoForward);

  const bookmarks = useProxyStore((s) => s.bookmarks);
  const addBookmark = useProxyStore((s) => s.addBookmark);
  const removeBookmark = useProxyStore((s) => s.removeBookmark);

  const toggleSidebar = useProxyStore((s) => s.toggleSidebar);
  const openSettings = useProxyStore((s) => s.openSettings);
  const openPalette = useProxyStore((s) => s.openPalette);
  const newTab = useProxyStore((s) => s.newTab);
  const { toast } = useToast();

  const [typed, setTyped] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const address = focused ? typed : tab?.address || "";

  const isBookmarked = tab?.url
    ? bookmarks.some((b) => b.url === tab.url)
    : false;

  const handleBookmark = async () => {
    if (!tab?.url) return;
    if (isBookmarked) {
      const b = bookmarks.find((x) => x.url === tab.url);
      if (b) {
        await fetch(`/api/bookmarks?id=${b.id}`, { method: "DELETE" });
        removeBookmark(b.id);
        toast({ title: "Bookmark removed" });
      }
    } else {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: tab.url,
          title: tab.title || hostnameOf(tab.url),
          favicon: faviconFor(tab.url),
        }),
      });
      const data = await res.json();
      if (data.item) {
        addBookmark(data.item);
        toast({ title: "Bookmarked", description: hostnameOf(tab.url) });
      }
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tab) return;
    navigate(tab.id, address);
    setTyped("");
    inputRef.current?.blur();
  };

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-background border-b border-border">
      {/* Back / Forward / Reload / Home */}
      <NavButton
        onClick={() => tab && goBack(tab.id)}
        disabled={!tab || !canGoBack(tab.id)}
        title="Back (Alt+Left)"
      >
        <ArrowLeft className="h-4 w-4" />
      </NavButton>
      <NavButton
        onClick={() => tab && goForward(tab.id)}
        disabled={!tab || !canGoForward(tab.id)}
        title="Forward (Alt+Right)"
      >
        <ArrowRight className="h-4 w-4" />
      </NavButton>
      <NavButton onClick={() => tab && reload(tab.id)} disabled={!tab?.url} title="Reload (Ctrl+R)">
        <RotateCw className="h-4 w-4" />
      </NavButton>
      <NavButton onClick={() => tab && goHome(tab.id)} title="Home">
        <House className="h-4 w-4" />
      </NavButton>

      {/* Address bar */}
      <form onSubmit={submit} className="flex-1 min-w-0 mx-1">
        <div
          className={cn(
            "group flex h-9 items-center gap-2 rounded-full border px-3 transition-all",
            focused
              ? "border-emerald-500/50 bg-background ring-2 ring-emerald-500/15"
              : "border-border bg-muted/50 hover:bg-muted"
          )}
        >
          <span className="flex-shrink-0 text-muted-foreground">
            {tab?.url ? (
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Globe className="h-3.5 w-3.5" />
            )}
          </span>
          <input
            ref={inputRef}
            value={address}
            onChange={(e) => setTyped(e.target.value)}
            onFocus={(e) => {
              setFocused(true);
              setTyped(tab?.address || "");
              e.target.select();
            }}
            onBlur={() => setFocused(false)}
            placeholder="Search the web or enter a URL"
            className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            spellCheck={false}
            autoComplete="off"
          />
          {tab?.url && (
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <Lock className="h-2.5 w-2.5" /> PROXY
            </span>
          )}
          {address && focused && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setTyped("")}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </form>

      {/* Bookmark */}
      <NavButton
        onClick={handleBookmark}
        disabled={!tab?.url}
        title={isBookmarked ? "Remove bookmark" : "Bookmark this page"}
        active={isBookmarked}
      >
        {isBookmarked ? (
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
        ) : (
          <StarOff className="h-4 w-4" />
        )}
      </NavButton>

      {/* Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Proxy Browser</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => newTab()}>
            <span className="mr-2">New tab</span>
            <span className="ml-auto text-xs text-muted-foreground">Ctrl+T</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => newTab(undefined, true)}>
            <span className="mr-2">New incognito tab</span>
            <span className="ml-auto text-xs text-muted-foreground">Ctrl+Shift+T</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openPalette}>
            <span className="mr-2">Command palette</span>
            <span className="ml-auto text-xs text-muted-foreground">Ctrl+K</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              if (tab?.url) {
                navigator.clipboard.writeText(tab.url);
                toast({ title: "URL copied to clipboard" });
              }
            }}
            disabled={!tab?.url}
          >
            Copy page URL
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              if (tab?.url) {
                window.open(tab.url, "_blank");
              }
            }}
            disabled={!tab?.url}
          >
            Open original (direct)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => toggleSidebar("history")}>
            History
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toggleSidebar("bookmarks")}>
            Bookmarks
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openSettings}>Settings</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function NavButton({
  children,
  onClick,
  disabled,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
        disabled
          ? "text-muted-foreground/40 cursor-not-allowed"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        active && "text-foreground"
      )}
    >
      {children}
    </button>
  );
}
