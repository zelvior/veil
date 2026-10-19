/**
 * IndexedDB Storage Layer
 *
 * Replaces the Prisma/SQLite server-side storage with client-side IndexedDB.
 * All user data (history, bookmarks, settings, quicklinks) now lives in the
 * browser — no server database needed, works fully offline, and data never
 * leaves the user's device.
 *
 * This is a significant privacy upgrade: the server has zero access to user
 * data. The proxy server only fetches and rewrites pages; it stores nothing.
 */

const DB_NAME = "veil-browser";
const DB_VERSION = 1;

const STORES = {
  history: "history",
  bookmarks: "bookmarks",
  settings: "settings",
  quicklinks: "quicklinks",
} as const;

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  favicon: string | null;
  visitedAt: number; // epoch ms
}

export interface BookmarkEntry {
  id: string;
  url: string;
  title: string;
  favicon: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface QuickLinkEntry {
  id: string;
  url: string;
  title: string;
  icon: string | null;
  color: string | null;
  position: number;
  createdAt: number;
}

export interface SettingEntry {
  key: string;
  value: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

/** Open (or create) the IndexedDB database. */
function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // History store — indexed by visitedAt for time-based queries
      if (!db.objectStoreNames.contains(STORES.history)) {
        const store = db.createObjectStore(STORES.history, { keyPath: "id" });
        store.createIndex("visitedAt", "visitedAt", { unique: false });
        store.createIndex("url", "url", { unique: false });
      }

      // Bookmarks store — indexed by url for dedup checks
      if (!db.objectStoreNames.contains(STORES.bookmarks)) {
        const store = db.createObjectStore(STORES.bookmarks, { keyPath: "id" });
        store.createIndex("url", "url", { unique: false });
      }

      // Settings store — key-value
      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings, { keyPath: "key" });
      }

      // QuickLinks store — ordered by position
      if (!db.objectStoreNames.contains(STORES.quicklinks)) {
        db.createObjectStore(STORES.quicklinks, { keyPath: "id" });
      }
    };
  });
  return dbPromise;
}

/** Generate a unique ID. */
function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Run a transaction on a store. */
async function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = fn(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Run a transaction that returns all matching records via a cursor. */
async function txCursor<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest,
  filter?: (record: T) => boolean
): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const results: T[] = [];
    const request = fn(store);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const record = cursor.value as T;
        if (!filter || filter(record)) results.push(record);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/* ------------------------------------------------------------------ */
/* History API                                                         */
/* ------------------------------------------------------------------ */

export const historyDB = {
  async add(entry: Omit<HistoryEntry, "id" | "visitedAt">): Promise<HistoryEntry> {
    // Dedup: if the same URL was visited in the last 60 seconds, skip.
    const recent = await this.findRecent(60_000);
    const existing = recent.find((h) => h.url === entry.url);
    if (existing) return existing;

    const full: HistoryEntry = {
      ...entry,
      id: genId(),
      visitedAt: Date.now(),
    };
    await tx(STORES.history, "readwrite", (store) => store.add(full));
    return full;
  },

  async getAll(limit?: number): Promise<HistoryEntry[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.history, "readonly");
      const store = transaction.objectStore(STORES.history);
      const index = store.index("visitedAt");
      const results: HistoryEntry[] = [];
      const request = index.openCursor(null, "prev"); // descending order
      let count = 0;
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && (!limit || count < limit)) {
          results.push(cursor.value as HistoryEntry);
          count++;
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  async search(query: string, limit: number = 100): Promise<HistoryEntry[]> {
    const q = query.toLowerCase();
    return txCursor<HistoryEntry>(
      STORES.history,
      "readonly",
      (store) => store.index("visitedAt").openCursor(null, "prev"),
      (record) =>
        record.url.toLowerCase().includes(q) ||
        record.title.toLowerCase().includes(q)
    ).then((results) => results.slice(0, limit));
  },

  async findRecent(withinMs: number): Promise<HistoryEntry[]> {
    const cutoff = Date.now() - withinMs;
    return txCursor<HistoryEntry>(
      STORES.history,
      "readonly",
      (store) => store.index("visitedAt").openCursor(IDBKeyRange.lowerBound(cutoff)),
      () => true
    );
  },

  async delete(id: string): Promise<void> {
    await tx(STORES.history, "readwrite", (store) => store.delete(id));
  },

  async clearAll(): Promise<void> {
    await tx(STORES.history, "readwrite", (store) => store.clear());
  },

  async count(): Promise<number> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.history, "readonly");
      const store = transaction.objectStore(STORES.history);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
};

/* ------------------------------------------------------------------ */
/* Bookmarks API                                                       */
/* ------------------------------------------------------------------ */

export const bookmarksDB = {
  async add(entry: Omit<BookmarkEntry, "id" | "createdAt" | "updatedAt">): Promise<BookmarkEntry> {
    // Dedup by URL
    const existing = await this.findByUrl(entry.url);
    if (existing) return existing;

    const full: BookmarkEntry = {
      ...entry,
      id: genId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await tx(STORES.bookmarks, "readwrite", (store) => store.add(full));
    return full;
  },

  async getAll(): Promise<BookmarkEntry[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.bookmarks, "readonly");
      const store = transaction.objectStore(STORES.bookmarks);
      const results: BookmarkEntry[] = [];
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          results.push(cursor.value as BookmarkEntry);
          cursor.continue();
        } else {
          // Sort by createdAt descending
          results.sort((a, b) => b.createdAt - a.createdAt);
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  async findByUrl(url: string): Promise<BookmarkEntry | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.bookmarks, "readonly");
      const store = transaction.objectStore(STORES.bookmarks);
      const index = store.index("url");
      const request = index.get(url);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  async delete(id: string): Promise<void> {
    await tx(STORES.bookmarks, "readwrite", (store) => store.delete(id));
  },

  async clearAll(): Promise<void> {
    await tx(STORES.bookmarks, "readwrite", (store) => store.clear());
  },
};

/* ------------------------------------------------------------------ */
/* Settings API (key-value)                                            */
/* ------------------------------------------------------------------ */

export const settingsDB = {
  async get(key: string): Promise<string | null> {
    try {
      const result = await tx<SettingEntry>(STORES.settings, "readonly", (store) =>
        store.get(key)
      );
      return result?.value ?? null;
    } catch {
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    await tx(STORES.settings, "readwrite", (store) =>
      store.put({ key, value } as SettingEntry)
    );
  },

  async getAll(): Promise<Record<string, string>> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.settings, "readonly");
      const store = transaction.objectStore(STORES.settings);
      const results: Record<string, string> = {};
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const entry = cursor.value as SettingEntry;
          results[entry.key] = entry.value;
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  async clearAll(): Promise<void> {
    await tx(STORES.settings, "readwrite", (store) => store.clear());
  },
};

/* ------------------------------------------------------------------ */
/* QuickLinks API                                                      */
/* ------------------------------------------------------------------ */

export const quicklinksDB = {
  async add(entry: Omit<QuickLinkEntry, "id" | "createdAt" | "position">): Promise<QuickLinkEntry> {
    const count = await this.count();
    const full: QuickLinkEntry = {
      ...entry,
      id: genId(),
      position: count,
      createdAt: Date.now(),
    };
    await tx(STORES.quicklinks, "readwrite", (store) => store.add(full));
    return full;
  },

  async getAll(): Promise<QuickLinkEntry[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.quicklinks, "readonly");
      const store = transaction.objectStore(STORES.quicklinks);
      const results: QuickLinkEntry[] = [];
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          results.push(cursor.value as QuickLinkEntry);
          cursor.continue();
        } else {
          results.sort((a, b) => a.position - b.position);
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  async count(): Promise<number> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.quicklinks, "readonly");
      const store = transaction.objectStore(STORES.quicklinks);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async delete(id: string): Promise<void> {
    await tx(STORES.quicklinks, "readwrite", (store) => store.delete(id));
  },

  async update(id: string, patch: Partial<QuickLinkEntry>): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.quicklinks, "readwrite");
      const store = transaction.objectStore(STORES.quicklinks);
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const existing = getRequest.result as QuickLinkEntry | undefined;
        if (!existing) {
          reject(new Error("QuickLink not found"));
          return;
        }
        const updated = { ...existing, ...patch };
        store.put(updated);
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },
};

/* ------------------------------------------------------------------ */
/* Utility: clear all data                                             */
/* ------------------------------------------------------------------ */

export async function clearAllData(): Promise<void> {
  await Promise.all([
    historyDB.clearAll(),
    bookmarksDB.clearAll(),
    settingsDB.clearAll(),
    quicklinksDB.clearAll(),
  ]);
}

/** Check if IndexedDB is available in the current environment. */
export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}
