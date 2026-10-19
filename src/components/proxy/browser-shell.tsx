"use client";

import { useEffect, useRef } from "react";
import { useProxyStore } from "@/store/proxy-store";
import { TabBar } from "./tab-bar";
import { NavigationBar } from "./navigation-bar";
import { BookmarksBar } from "./bookmarks-bar";
import { ProxyView } from "./proxy-view";
import { Sidebar } from "./sidebar";
import { CommandPalette } from "./command-palette";
import { SettingsDialog } from "./settings-dialog";
import { hostnameOf } from "@/lib/proxy";
import { Github, DiscordIcon, YoutubeIcon, LinktreeIcon } from "@/components/icons";
import Link from "next/link";

export function BrowserShell() {
  const tabs = useProxyStore((s) => s.tabs);
  const activeId = useProxyStore((s) => s.activeId);
  const settings = useProxyStore((s) => s.settings);
  const setBookmarks = useProxyStore((s) => s.setBookmarks);
  const setHistory = useProxyStore((s) => s.setHistory);
  const setQuickLinks = useProxyStore((s) => s.setQuickLinks);
  const setSettings = useProxyStore((s) => s.setSettings);
  const newTab = useProxyStore((s) => s.newTab);
  const openPalette = useProxyStore((s) => s.openPalette);
  const closePalette = useProxyStore((s) => s.closePalette);
  const reload = useProxyStore((s) => s.reload);
  const goBack = useProxyStore((s) => s.goBack);
  const goForward = useProxyStore((s) => s.goForward);
  const toggleSidebar = useProxyStore((s) => s.toggleSidebar);

  // first tab should become active on mount
  useEffect(() => {
    if (!activeId && tabs.length) {
      useProxyStore.setState({ activeId: tabs[0].id });
    }
  }, [activeId, tabs]);

  // load initial data
  useEffect(() => {
    (async () => {
      try {
        const [bm, hi, ql, st] = await Promise.all([
          fetch("/api/bookmarks").then((r) => r.json()),
          fetch("/api/history?limit=200").then((r) => r.json()),
          fetch("/api/quicklinks").then((r) => r.json()),
          fetch("/api/settings").then((r) => r.json()),
        ]);
        if (bm.items) setBookmarks(bm.items);
        if (hi.items) setHistory(hi.items);
        if (ql.items) setQuickLinks(ql.items);
        if (st.settings) {
          setSettings({
            searchEngine: st.settings.searchEngine,
            showBookmarksBar: st.settings.showBookmarksBar === "true",
            theme: st.settings.theme,
            browserProfile: st.settings.browserProfile,
          });
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [setBookmarks, setHistory, setQuickLinks, setSettings]);

  // apply theme
  useEffect(() => {
    const root = document.documentElement;
    const apply = (mode: "light" | "dark") => {
      root.classList.toggle("dark", mode === "dark");
    };
    if (settings.theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mq.matches ? "dark" : "light");
      const handler = (e: MediaQueryListEvent) => apply(e.matches ? "dark" : "light");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
    apply(settings.theme);
  }, [settings.theme]);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const state = useProxyStore.getState();
      const activeTab = state.tabs.find((x) => x.id === state.activeId);

      // Ctrl+T — new tab
      if (ctrl && e.key.toLowerCase() === "t" && !e.shiftKey) {
        e.preventDefault();
        newTab();
      }
      // Ctrl+Shift+T — new incognito tab
      else if (ctrl && e.shiftKey && e.key.toLowerCase() === "T") {
        e.preventDefault();
        newTab(undefined, true);
      }
      // Ctrl+K — command palette
      else if (ctrl && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      }
      // Ctrl+R — reload
      else if (ctrl && e.key.toLowerCase() === "r") {
        e.preventDefault();
        if (activeTab?.url) reload(activeTab.id);
      }
      // Ctrl+B — bookmarks sidebar
      else if (ctrl && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar("bookmarks");
      }
      // Ctrl+H — history sidebar
      else if (ctrl && e.key.toLowerCase() === "h") {
        e.preventDefault();
        toggleSidebar("history");
      }
      // Ctrl+F — find in page
      else if (ctrl && e.key.toLowerCase() === "f") {
        e.preventDefault();
        state.toggleFindInPage();
      }
      // Ctrl+L — focus address bar
      else if (ctrl && e.key.toLowerCase() === "l") {
        e.preventDefault();
        const input = document.querySelector('input[placeholder*="Search the web"]') as HTMLInputElement;
        input?.focus();
        input?.select();
      }
      // Ctrl+D — bookmark current page
      else if (ctrl && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (activeTab?.url) {
          fetch("/api/bookmarks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: activeTab.url,
              title: activeTab.title || hostnameOf(activeTab.url),
              favicon: activeTab.favicon,
            }),
          }).then(r => r.json()).then(data => {
            if (data.item) state.addBookmark(data.item);
          });
        }
      }
      // Ctrl+= (zoom in) / Ctrl+- (zoom out) / Ctrl+0 (reset)
      else if (ctrl && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        if (activeTab) state.zoomIn(activeTab.id);
      }
      else if (ctrl && e.key === "-") {
        e.preventDefault();
        if (activeTab) state.zoomOut(activeTab.id);
      }
      else if (ctrl && e.key === "0") {
        e.preventDefault();
        if (activeTab) state.zoomReset(activeTab.id);
      }
      // Ctrl+Tab — next tab
      else if (ctrl && e.key === "Tab") {
        e.preventDefault();
        const idx = state.tabs.findIndex(t => t.id === state.activeId);
        const next = state.tabs[(idx + 1) % state.tabs.length];
        if (next) state.activateTab(next.id);
      }
      // Ctrl+W — close tab
      else if (ctrl && e.key.toLowerCase() === "w") {
        e.preventDefault();
        if (activeTab) state.closeTab(activeTab.id);
      }
      // Alt+Left — back
      else if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        if (activeTab) goBack(activeTab.id);
      }
      // Alt+Right — forward
      else if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        if (activeTab) goForward(activeTab.id);
      }
      // F11 — toggle fullscreen
      else if (e.key === "F11") {
        e.preventDefault();
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.();
      }
      // Escape — close overlays
      else if (e.key === "Escape") {
        if (state.paletteOpen) closePalette();
        else if (state.findInPageOpen) state.closeFindInPage();
        else if (state.sidebarOpen) state.setSidebar(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newTab, openPalette, reload, toggleSidebar, goBack, goForward, closePalette]);

  // record history when active tab navigates to a real URL
  const lastRecorded = useRef<Record<string, string>>({});
  useEffect(() => {
    const tab = tabs.find((t) => t.id === activeId);
    if (!tab || !tab.url || tab.incognito) return;
    if (lastRecorded.current[tab.id] === tab.url) return;
    lastRecorded.current[tab.id] = tab.url;
    fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: tab.url,
        title: tab.title || hostnameOf(tab.url),
        favicon: tab.favicon,
      }),
    }).then((r) => r.json()).then((data) => {
      if (data.item) useProxyStore.getState().addHistory(data.item);
    }).catch(() => {});
  }, [activeId, tabs]);

  const activeTab = tabs.find((t) => t.id === activeId) || tabs[0];

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="flex flex-1 min-w-0 flex-col">
          <TabBar />
          <NavigationBar />
          <BookmarksBar />
          {activeTab && <ProxyView key={activeTab.id} tab={activeTab} />}
        </div>
      </div>
      <Footer tab={activeTab} />
      <CommandPalette />
      <SettingsDialog />
    </div>
  );
}

function Footer({ tab }: { tab: { url: string; title: string; incognito: boolean } | undefined }) {
  const hoveredUrl = useProxyStore((s) => s.hoveredUrl);
  const findInPageOpen = useProxyStore((s) => s.findInPageOpen);
  const toggleFindInPage = useProxyStore((s) => s.toggleFindInPage);
  const zoomLevels = useProxyStore((s) => s.zoomLevels);
  const activeId = useProxyStore((s) => s.activeId);
  const zoom = zoomLevels[activeId] || 1;
  const socialLinks = [
    {
      href: "https://github.com/zelvior/veil",
      label: "GitHub",
      icon: <Github className="h-3.5 w-3.5" />,
    },
    {
      href: "https://discord.gg/UQfzQzymc",
      label: "Discord",
      icon: <DiscordIcon className="h-3.5 w-3.5" />,
    },
    {
      href: "https://linktr.ee/zelvior",
      label: "Linktree",
      icon: <LinktreeIcon className="h-3.5 w-3.5" />,
    },
    {
      href: "https://youtube.com/@zelviorhere",
      label: "YouTube",
      icon: <YoutubeIcon className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <footer className="flex items-center justify-between border-t border-border bg-zinc-950 px-3 py-1.5 text-[11px] text-zinc-400 dark:text-zinc-400">
      {/* Left: proxy status / hovered URL (status bar behavior) */}
      <div className="flex items-center gap-2 min-w-0">
        <img src="/logo.png" alt="Veil" className="h-4 w-4 rounded-sm flex-shrink-0 bg-white" />
        <span className="font-semibold text-zinc-200">Veil</span>
        {/* Status bar: show hovered link URL when hovering, otherwise show proxy status */}
        {hoveredUrl ? (
          <span className="truncate text-emerald-400/80" title={hoveredUrl}>
            → {hoveredUrl}
          </span>
        ) : (
          <>
            <span className="text-zinc-600">·</span>
            <span className="hidden sm:inline text-zinc-500">
              Built by{" "}
              <a
                href="https://linktr.ee/zelvior"
                target="_blank"
                rel="noreferrer"
                className="text-zinc-300 hover:text-emerald-400 transition-colors font-medium"
              >
                Zelvior Labs
              </a>
            </span>
            {tab?.incognito && (
              <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-400">
                Incognito
              </span>
            )}
            <span className="hidden md:inline truncate text-zinc-500">
              {tab?.url ? `· Proxied · ${hostnameOf(tab.url)}` : "· Ready"}
            </span>
          </>
        )}
      </div>

      {/* Center: find-in-page toggle + zoom indicator */}
      <div className="hidden sm:flex items-center gap-2">
        <button
          onClick={toggleFindInPage}
          className={`flex h-6 px-2 items-center justify-center rounded-md text-[10px] font-medium transition-all ${
            findInPageOpen
              ? "bg-emerald-500/20 text-emerald-400"
              : "text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800"
          }`}
          title="Find in page (Ctrl+F)"
        >
          Find
        </button>
        {zoom !== 1 && (
          <span className="text-[10px] text-zinc-500 tabular-nums">{Math.round(zoom * 100)}%</span>
        )}
      </div>

      {/* Right: legal + social links */}
      <div className="flex items-center gap-0.5">
        <Link
          href="/legal"
          title="Legal & Information"
          className="hidden sm:flex h-6 px-2 items-center justify-center rounded-md text-zinc-500 transition-all hover:text-emerald-400 hover:bg-zinc-800 text-[11px] font-medium"
        >
          Legal
        </Link>
        <span className="hidden lg:inline text-zinc-600 mx-1">·</span>
        <span className="hidden lg:inline text-zinc-600 mr-1">Apache 2.0</span>
        {socialLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            title={link.label}
            aria-label={link.label}
            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 transition-all hover:text-emerald-400 hover:bg-zinc-800"
          >
            {link.icon}
          </a>
        ))}
      </div>
    </footer>
  );
}
