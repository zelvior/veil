"use client";

import { create } from "zustand";
import { normaliseAddressInput, faviconFor } from "@/lib/proxy";
import { DEFAULT_PROFILE_ID } from "@/lib/browser-profiles";

export interface Tab {
  id: string;
  /** What the address bar shows. */
  address: string;
  /** The actual URL being proxied (empty for the new-tab page). */
  url: string;
  /** Display title. */
  title: string;
  favicon: string;
  loading: boolean;
  /** History stack for back/forward. */
  history: string[];
  historyIndex: number;
  /** Key used to force iframe reload. */
  reloadKey: number;
  incognito: boolean;
  error: string | null;
}

export type SidebarPanel = "history" | "bookmarks" | "downloads" | null;

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  favicon: string | null;
}

export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  favicon: string | null;
  visitedAt: string;
}

export interface QuickLink {
  id: string;
  url: string;
  title: string;
  icon: string | null;
  color: string | null;
}

export interface Settings {
  searchEngine: string;
  /** Browser profile id (from BROWSER_PROFILES). */
  browserProfile: string;
  theme: "light" | "dark" | "system";
  showBookmarksBar: boolean;
  /** Whether the proxy is enabled (on/off toggle). */
  proxyEnabled: boolean;
  /** Whether auto-redirect blocking is enabled. */
  blockRedirects: boolean;
  /** Whether ad blocking is enabled (expanded blocklist + cosmetic filters). */
  blockAds: boolean;
  /** Whether traffic masking is enabled (timing randomization + decoy requests). */
  trafficMask: boolean;
  /** Accent color for the UI. */
  accentColor: AccentColor;
  /** UI density: compact = smaller padding, comfortable = default, spacious = larger. */
  density: "compact" | "comfortable" | "spacious";
  /** Font family for the UI. */
  fontFamily: "system" | "inter" | "geistsans" | "geistmono" | "serif";
  /** Whether to show the status bar in the footer. */
  showStatusBar: boolean;
  /** Whether to show favicons in the tab bar. */
  showFavicons: boolean;
  /** Custom homepage URL (empty = new tab page). */
  homepage: string;
}

export type AccentColor =
  | "emerald"
  | "blue"
  | "violet"
  | "rose"
  | "amber"
  | "cyan"
  | "orange"
  | "pink";

export const ACCENT_COLORS: Record<AccentColor, { name: string; value: string; rgb: string }> = {
  emerald: { name: "Emerald", value: "#10b981", rgb: "16, 185, 129" },
  blue: { name: "Blue", value: "#3b82f6", rgb: "59, 130, 246" },
  violet: { name: "Violet", value: "#8b5cf6", rgb: "139, 92, 246" },
  rose: { name: "Rose", value: "#f43f5e", rgb: "244, 63, 94" },
  amber: { name: "Amber", value: "#f59e0b", rgb: "245, 158, 11" },
  cyan: { name: "Cyan", value: "#06b6d4", rgb: "6, 182, 212" },
  orange: { name: "Orange", value: "#f97316", rgb: "249, 115, 22" },
  pink: { name: "Pink", value: "#ec4899", rgb: "236, 72, 153" },
};

const SEARCH_ENGINES: Record<string, string> = {
  duckduckgo: "https://duckduckgo.com/?q={q}",
  google: "https://www.google.com/search?q={q}",
  bing: "https://www.bing.com/search?q={q}",
  brave: "https://search.brave.com/search?q={q}",
  startpage: "https://www.startpage.com/sp/search?query={q}",
  ecosia: "https://www.ecosia.org/search?q={q}",
};

let tabSeq = 1;
const newTabId = () => `tab-${Date.now()}-${tabSeq++}`;

function makeNewTab(): Tab {
  return {
    id: newTabId(),
    address: "",
    url: "",
    title: "New Tab",
    favicon: "",
    loading: false,
    history: [],
    historyIndex: -1,
    reloadKey: 0,
    incognito: false,
    error: null,
  };
}

interface ProxyState {
  tabs: Tab[];
  activeId: string;
  sidebarOpen: boolean;
  sidebarPanel: SidebarPanel;
  paletteOpen: boolean;
  settingsOpen: boolean;
  findInPageOpen: boolean;
  /** Current zoom level per tab (1 = 100%, 1.25 = 125%). */
  zoomLevels: Record<string, number>;
  /** Hovered link URL for status bar display. */
  hoveredUrl: string | null;
  bookmarks: Bookmark[];
  history: HistoryItem[];
  quickLinks: QuickLink[];
  settings: Settings;
  bookmarksBarVisible: boolean;

  // tab ops
  newTab: (url?: string, incognito?: boolean) => void;
  closeTab: (id: string) => void;
  activateTab: (id: string) => void;
  updateTab: (id: string, patch: Partial<Tab>) => void;

  // navigation
  navigate: (id: string, input: string) => void;
  reload: (id: string) => void;
  goBack: (id: string) => void;
  goForward: (id: string) => void;
  goHome: (id: string) => void;
  canGoBack: (id: string) => boolean;
  canGoForward: (id: string) => boolean;

  // address updates from iframe
  onProxiedNavigate: (id: string, url: string, title: string) => void;

  // ui
  toggleSidebar: (panel?: SidebarPanel) => void;
  setSidebar: (open: boolean, panel?: SidebarPanel) => void;
  openPalette: () => void;
  closePalette: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleFindInPage: () => void;
  closeFindInPage: () => void;
  setZoom: (tabId: string, zoom: number) => void;
  zoomIn: (tabId: string) => void;
  zoomOut: (tabId: string) => void;
  zoomReset: (tabId: string) => void;
  getZoom: (tabId: string) => number;
  setHoveredUrl: (url: string | null) => void;

  // data
  setBookmarks: (b: Bookmark[]) => void;
  setHistory: (h: HistoryItem[]) => void;
  setQuickLinks: (q: QuickLink[]) => void;
  setSettings: (s: Partial<Settings>) => void;
  addBookmark: (b: Bookmark) => void;
  removeBookmark: (id: string) => void;
  addHistory: (h: HistoryItem) => void;
  addQuickLink: (q: QuickLink) => void;
  removeQuickLink: (id: string) => void;
  clearHistory: () => void;
}

export const useProxyStore = create<ProxyState>((set, get) => ({
  tabs: [makeNewTab()],
  activeId: "",
  sidebarOpen: false,
  sidebarPanel: null,
  paletteOpen: false,
  settingsOpen: false,
  findInPageOpen: false,
  zoomLevels: {},
  hoveredUrl: null,
  bookmarks: [],
  history: [],
  quickLinks: [],
  bookmarksBarVisible: true,
  settings: {
    searchEngine: SEARCH_ENGINES.duckduckgo,
    browserProfile: DEFAULT_PROFILE_ID,
    theme: "system",
    showBookmarksBar: true,
    proxyEnabled: true,
    blockRedirects: true,
    blockAds: true,
    trafficMask: false,
    accentColor: "emerald",
    density: "comfortable",
    fontFamily: "system",
    showStatusBar: true,
    showFavicons: true,
    homepage: "",
  },

  newTab: (url, incognito = false) => {
    const tab = makeNewTab();
    tab.incognito = incognito;
    if (url) {
      const full = normaliseAddressInput(url, get().settings.searchEngine);
      tab.address = full;
      tab.url = full;
      tab.title = full;
      tab.favicon = faviconFor(full);
      tab.loading = true;
      tab.history = [full];
      tab.historyIndex = 0;
      tab.reloadKey = 1;
    }
    set((s) => ({ tabs: [...s.tabs, tab], activeId: tab.id }));
  },

  closeTab: (id) => {
    const { tabs, activeId } = get();
    const idx = tabs.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const next = tabs.filter((t) => t.id !== id);
    if (next.length === 0) {
      const fresh = makeNewTab();
      set({ tabs: [fresh], activeId: fresh.id });
      return;
    }
    let newActive = activeId;
    if (activeId === id) {
      const fallback = next[Math.min(idx, next.length - 1)];
      newActive = fallback.id;
    }
    set({ tabs: next, activeId: newActive });
  },

  activateTab: (id) => set({ activeId: id }),

  updateTab: (id, patch) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),

  navigate: (id, input) => {
    const full = normaliseAddressInput(input, get().settings.searchEngine);
    const tab = get().tabs.find((t) => t.id === id);
    if (!tab) return;
    const truncated = tab.history.slice(0, tab.historyIndex + 1);
    truncated.push(full);
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id
          ? {
              ...t,
              address: full,
              url: full,
              title: full,
              favicon: faviconFor(full),
              loading: true,
              error: null,
              history: truncated,
              historyIndex: truncated.length - 1,
              reloadKey: t.reloadKey + 1,
            }
          : t
      ),
    }));
  },

  reload: (id) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id
          ? { ...t, loading: true, error: null, reloadKey: t.reloadKey + 1 }
          : t
      ),
    })),

  goBack: (id) => {
    const tab = get().tabs.find((t) => t.id === id);
    if (!tab || tab.historyIndex <= 0) return;
    const idx = tab.historyIndex - 1;
    const url = tab.history[idx];
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id
          ? {
              ...t,
              address: url,
              url,
              title: url,
              favicon: faviconFor(url),
              loading: true,
              error: null,
              historyIndex: idx,
              reloadKey: t.reloadKey + 1,
            }
          : t
      ),
    }));
  },

  goForward: (id) => {
    const tab = get().tabs.find((t) => t.id === id);
    if (!tab || tab.historyIndex >= tab.history.length - 1) return;
    const idx = tab.historyIndex + 1;
    const url = tab.history[idx];
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id
          ? {
              ...t,
              address: url,
              url,
              title: url,
              favicon: faviconFor(url),
              loading: true,
              error: null,
              historyIndex: idx,
              reloadKey: t.reloadKey + 1,
            }
          : t
      ),
    }));
  },

  goHome: (id) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id
          ? {
              ...t,
              address: "",
              url: "",
              title: "New Tab",
              favicon: "",
              loading: false,
              error: null,
            }
          : t
      ),
    })),

  canGoBack: (id) => {
    const t = get().tabs.find((x) => x.id === id);
    return !!t && t.historyIndex > 0;
  },
  canGoForward: (id) => {
    const t = get().tabs.find((x) => x.id === id);
    return !!t && t.historyIndex < t.history.length - 1;
  },

  onProxiedNavigate: (id, url, title) => {
    const tab = get().tabs.find((t) => t.id === id);
    if (!tab) return;
    // If the iframe navigated to a URL that matches current history top, just update title
    const top = tab.history[tab.historyIndex];
    if (top && sameUrl(top, url)) {
      set((s) => ({
        tabs: s.tabs.map((t) =>
          t.id === id
            ? {
                ...t,
                address: url,
                url,
                title: title || url,
                loading: false,
                favicon: faviconFor(url),
              }
            : t
        ),
      }));
      return;
    }
    // Otherwise push the new URL
    const truncated = tab.history.slice(0, tab.historyIndex + 1);
    truncated.push(url);
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id
          ? {
              ...t,
              address: url,
              url,
              title: title || url,
              loading: false,
              favicon: faviconFor(url),
              history: truncated,
              historyIndex: truncated.length - 1,
            }
          : t
      ),
    }));
  },

  toggleSidebar: (panel) =>
    set((s) => {
      if (panel && s.sidebarOpen && s.sidebarPanel === panel) {
        return { sidebarOpen: false, sidebarPanel: null };
      }
      return { sidebarOpen: !s.sidebarOpen || panel !== undefined, sidebarPanel: panel ?? s.sidebarPanel };
    }),
  setSidebar: (open, panel) =>
    set({ sidebarOpen: open, sidebarPanel: panel ?? null }),

  openPalette: () => set({ paletteOpen: true }),
  closePalette: () => set({ paletteOpen: false }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  toggleFindInPage: () => set((s) => ({ findInPageOpen: !s.findInPageOpen })),
  closeFindInPage: () => set({ findInPageOpen: false }),

  setZoom: (tabId, zoom) =>
    set((s) => ({
      zoomLevels: { ...s.zoomLevels, [tabId]: Math.max(0.25, Math.min(5, zoom)) },
    })),
  zoomIn: (tabId) =>
    set((s) => {
      const current = s.zoomLevels[tabId] || 1;
      const next = Math.min(5, current + 0.1);
      return { zoomLevels: { ...s.zoomLevels, [tabId]: next } };
    }),
  zoomOut: (tabId) =>
    set((s) => {
      const current = s.zoomLevels[tabId] || 1;
      const next = Math.max(0.25, current - 0.1);
      return { zoomLevels: { ...s.zoomLevels, [tabId]: next } };
    }),
  zoomReset: (tabId) =>
    set((s) => {
      const { [tabId]: _, ...rest } = s.zoomLevels;
      return { zoomLevels: rest };
    }),
  getZoom: (tabId) => get().zoomLevels[tabId] || 1,

  setHoveredUrl: (url) => set({ hoveredUrl: url }),

  setBookmarks: (b) => set({ bookmarks: b }),
  setHistory: (h) => set({ history: h }),
  setQuickLinks: (q) => set({ quickLinks: q }),
  setSettings: (s) => set((state) => ({ settings: { ...state.settings, ...s } })),
  addBookmark: (b) => set((s) => ({ bookmarks: [b, ...s.bookmarks] })),
  removeBookmark: (id) =>
    set((s) => ({ bookmarks: s.bookmarks.filter((x) => x.id !== id) })),
  addHistory: (h) => set((s) => ({ history: [h, ...s.history] })),
  addQuickLink: (q) => set((s) => ({ quickLinks: [...s.quickLinks, q] })),
  removeQuickLink: (id) =>
    set((s) => ({ quickLinks: s.quickLinks.filter((x) => x.id !== id) })),
  clearHistory: () => set({ history: [] }),
}));

function sameUrl(a: string, b: string): boolean {
  try {
    return new URL(a).href.replace(/\/$/, "") === new URL(b).href.replace(/\/$/, "");
  } catch {
    return a === b;
  }
}

export { SEARCH_ENGINES };
