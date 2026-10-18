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
      if (ctrl && e.key.toLowerCase() === "t") {
        e.preventDefault();
        newTab();
      } else if (ctrl && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      } else if (ctrl && e.key.toLowerCase() === "r") {
        e.preventDefault();
        const t = useProxyStore.getState().tabs.find((x) => x.id === useProxyStore.getState().activeId);
        if (t?.url) reload(t.id);
      } else if (ctrl && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar("bookmarks");
      } else if (ctrl && e.key.toLowerCase() === "h") {
        e.preventDefault();
        toggleSidebar("history");
      } else if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        const t = useProxyStore.getState().tabs.find((x) => x.id === useProxyStore.getState().activeId);
        if (t) goBack(t.id);
      } else if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        const t = useProxyStore.getState().tabs.find((x) => x.id === useProxyStore.getState().activeId);
        if (t) goForward(t.id);
      } else if (e.key === "Escape" && useProxyStore.getState().paletteOpen) {
        closePalette();
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
      {/* Left: proxy status */}
      <div className="flex items-center gap-2 min-w-0">
        <img src="/logo.png" alt="Veil" className="h-4 w-4 rounded-sm flex-shrink-0 bg-white" />
        <span className="font-semibold text-zinc-200">Veil</span>
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
      </div>

      {/* Right: social links */}
      <div className="flex items-center gap-0.5">
        <span className="hidden lg:inline text-zinc-600 mr-2">Apache 2.0</span>
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
