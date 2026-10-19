"use client";

import { useEffect, useRef } from "react";
import { useProxyStore } from "@/store/proxy-store";
import {
  historyDB,
  bookmarksDB,
  settingsDB,
  quicklinksDB,
  isIndexedDBAvailable,
} from "@/lib/indexeddb";

const DEFAULTS: Record<string, string> = {
  searchEngine: "https://duckduckgo.com/?q={q}",
  browserProfile: "chrome-win",
  theme: "system",
  showBookmarksBar: "true",
  proxyEnabled: "true",
  blockRedirects: "true",
  blockAds: "true",
  trafficMask: "false",
  accentColor: "emerald",
  density: "comfortable",
  fontFamily: "system",
  showStatusBar: "true",
  showFavicons: "true",
  homepage: "",
};

/**
 * Hook that loads all user data from IndexedDB on mount and keeps
 * the Zustand store in sync. All mutations go through the store,
 * which calls the IndexedDB API.
 *
 * This replaces the previous server-side Prisma/SQLite storage.
 */
export function useIndexedDBSync() {
  const setBookmarks = useProxyStore((s) => s.setBookmarks);
  const setHistory = useProxyStore((s) => s.setHistory);
  const setQuickLinks = useProxyStore((s) => s.setQuickLinks);
  const setSettings = useProxyStore((s) => s.setSettings);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    if (!isIndexedDBAvailable()) {
      // IndexedDB not available (e.g., private browsing mode) — use defaults.
      return;
    }

    (async () => {
      try {
        // Load all data in parallel.
        const [history, bookmarks, quicklinks, settings] = await Promise.all([
          historyDB.getAll(500),
          bookmarksDB.getAll(),
          quicklinksDB.getAll(),
          settingsDB.getAll(),
        ]);

        // Map IndexedDB entries to store types.
        setHistory(
          history.map((h) => ({
            id: h.id,
            url: h.url,
            title: h.title,
            favicon: h.favicon,
            visitedAt: new Date(h.visitedAt).toISOString(),
          }))
        );
        setBookmarks(
          bookmarks.map((b) => ({
            id: b.id,
            url: b.url,
            title: b.title,
            favicon: b.favicon,
          }))
        );
        setQuickLinks(
          quicklinks.map((q) => ({
            id: q.id,
            url: q.url,
            title: q.title,
            icon: q.icon,
            color: q.color,
          }))
        );

        // Merge stored settings with defaults.
        const merged = { ...DEFAULTS, ...settings };
        setSettings({
          searchEngine: merged.searchEngine,
          browserProfile: merged.browserProfile,
          theme: merged.theme as "light" | "dark" | "system",
          showBookmarksBar: merged.showBookmarksBar === "true",
          proxyEnabled: merged.proxyEnabled === "true",
          blockRedirects: merged.blockRedirects === "true",
          blockAds: merged.blockAds === "true",
          trafficMask: merged.trafficMask === "true",
          accentColor: merged.accentColor as typeof DEFAULT_SETTINGS.accentColor,
          density: merged.density as typeof DEFAULT_SETTINGS.density,
          fontFamily: merged.fontFamily as typeof DEFAULT_SETTINGS.fontFamily,
          showStatusBar: merged.showStatusBar === "true",
          showFavicons: merged.showFavicons === "true",
          homepage: merged.homepage,
        });
      } catch (e) {
        // If IndexedDB fails (e.g., quota exceeded), fall back to defaults.
        console.warn("[IndexedDB] Failed to load data:", e);
      }
    })();
  }, [setBookmarks, setHistory, setQuickLinks, setSettings]);
}

/** Reference to the default settings for type inference. */
const DEFAULT_SETTINGS = {
  accentColor: "emerald" as const,
  density: "comfortable" as const,
  fontFamily: "system" as const,
};

/**
 * Persist a setting to IndexedDB.
 */
export async function persistSetting(key: string, value: string): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  try {
    await settingsDB.set(key, value);
  } catch (e) {
    console.warn("[IndexedDB] Failed to persist setting:", e);
  }
}

/**
 * Add a history entry to IndexedDB.
 */
export async function persistHistory(entry: {
  url: string;
  title: string;
  favicon: string | null;
}): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  try {
    await historyDB.add(entry);
  } catch (e) {
    console.warn("[IndexedDB] Failed to persist history:", e);
  }
}

/**
 * Add a bookmark to IndexedDB.
 */
export async function persistBookmark(entry: {
  url: string;
  title: string;
  favicon: string | null;
}): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  try {
    await bookmarksDB.add(entry);
  } catch (e) {
    console.warn("[IndexedDB] Failed to persist bookmark:", e);
  }
}

/**
 * Delete a bookmark from IndexedDB.
 */
export async function deleteBookmark(id: string): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  try {
    await bookmarksDB.delete(id);
  } catch (e) {
    console.warn("[IndexedDB] Failed to delete bookmark:", e);
  }
}

/**
 * Delete a history entry from IndexedDB.
 */
export async function deleteHistory(id: string): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  try {
    await historyDB.delete(id);
  } catch (e) {
    console.warn("[IndexedDB] Failed to delete history:", e);
  }
}

/**
 * Clear all history from IndexedDB.
 */
export async function clearHistory(): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  try {
    await historyDB.clearAll();
  } catch (e) {
    console.warn("[IndexedDB] Failed to clear history:", e);
  }
}

/**
 * Add a quick link to IndexedDB.
 */
export async function persistQuickLink(entry: {
  url: string;
  title: string;
  icon: string | null;
  color: string | null;
}): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  try {
    await quicklinksDB.add(entry);
  } catch (e) {
    console.warn("[IndexedDB] Failed to persist quick link:", e);
  }
}

/**
 * Delete a quick link from IndexedDB.
 */
export async function deleteQuickLink(id: string): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  try {
    await quicklinksDB.delete(id);
  } catch (e) {
    console.warn("[IndexedDB] Failed to delete quick link:", e);
  }
}
