/**
 * In-memory fallback store.
 *
 * Used when the real database (SQLite/PostgreSQL) is unavailable —
 * e.g., on Vercel serverless without a database configured.
 *
 * Data does NOT persist across cold starts, but it prevents the app
 * from crashing and keeps the proxy functional.
 *
 * The API mirrors the Prisma client methods used by the API routes
 * so they can call the same methods on either the real client or
 * this fallback.
 */

interface HistoryRow {
  id: string;
  url: string;
  title: string;
  favicon: string | null;
  visitedAt: Date;
}

interface BookmarkRow {
  id: string;
  url: string;
  title: string;
  favicon: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface QuickLinkRow {
  id: string;
  url: string;
  title: string;
  icon: string | null;
  color: string | null;
  position: number;
  createdAt: Date;
}

interface SettingRow {
  id: string;
  value: string;
}

let seq = 0;
const id = () => `mem-${Date.now()}-${seq++}`;

class MemoryDB {
  history: HistoryRow[] = [];
  bookmarks: BookmarkRow[] = [];
  quickLinks: QuickLinkRow[] = [];
  settings: Map<string, string> = new Map();

  // --- History ---
  async findHistory(opts?: {
    where?: { OR?: Array<Record<string, unknown>>; url?: string; visitedAt?: { gt?: Date } };
    orderBy?: { visitedAt: "desc" | "asc" };
    take?: number;
    skip?: number;
  }): Promise<HistoryRow[]> {
    let rows = [...this.history];
    if (opts?.where) {
      if (opts.where.url && opts.where.visitedAt?.gt) {
        rows = rows.filter(
          (r) => r.url === opts.where!.url && r.visitedAt > opts.where!.visitedAt!.gt!
        );
      } else if (opts.where.OR) {
        const conditions = opts.where.OR as Array<Record<string, unknown>>;
        rows = rows.filter((r) =>
          conditions.some((cond) => {
            if (cond.url && typeof cond.url === "object" && "contains" in cond.url) {
              return r.url.includes((cond.url as { contains: string }).contains);
            }
            if (cond.title && typeof cond.title === "object" && "contains" in cond.title) {
              return r.title.includes((cond.title as { contains: string }).contains);
            }
            return false;
          })
        );
      }
    }
    if (opts?.orderBy?.visitedAt === "desc") {
      rows.sort((a, b) => b.visitedAt.getTime() - a.visitedAt.getTime());
    }
    if (opts?.skip) rows = rows.slice(opts.skip);
    if (opts?.take) rows = rows.slice(0, opts.take);
    return rows;
  }

  async findFirstHistory(opts: {
    where: { url: string; visitedAt: { gt: Date } };
    orderBy: { visitedAt: "desc" };
  }): Promise<HistoryRow | null> {
    const rows = await this.findHistory({
      where: opts.where,
      orderBy: opts.orderBy,
      take: 1,
    });
    return rows[0] ?? null;
  }

  async createHistory(data: {
    url: string;
    title: string;
    favicon: string | null;
  }): Promise<HistoryRow> {
    const row: HistoryRow = {
      id: id(),
      url: data.url,
      title: data.title,
      favicon: data.favicon,
      visitedAt: new Date(),
    };
    this.history.push(row);
    return row;
  }

  async deleteHistory(id: string): Promise<void> {
    this.history = this.history.filter((r) => r.id !== id);
  }

  async deleteManyHistory(): Promise<{ count: number }> {
    const count = this.history.length;
    this.history = [];
    return { count };
  }

  // --- Bookmarks ---
  async findBookmarks(): Promise<BookmarkRow[]> {
    return [...this.bookmarks].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async findFirstBookmark(opts: { where: { url: string } }): Promise<BookmarkRow | null> {
    return this.bookmarks.find((r) => r.url === opts.where.url) ?? null;
  }

  async createBookmark(data: {
    url: string;
    title: string;
    favicon: string | null;
  }): Promise<BookmarkRow> {
    const row: BookmarkRow = {
      id: id(),
      url: data.url,
      title: data.title,
      favicon: data.favicon,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.bookmarks.push(row);
    return row;
  }

  async deleteBookmark(id: string): Promise<void> {
    this.bookmarks = this.bookmarks.filter((r) => r.id !== id);
  }

  async deleteManyBookmarks(opts: { where: { url: string } }): Promise<{ count: number }> {
    const count = this.bookmarks.filter((r) => r.url === opts.where.url).length;
    this.bookmarks = this.bookmarks.filter((r) => r.url !== opts.where.url);
    return { count };
  }

  // --- QuickLinks ---
  async findQuickLinks(): Promise<QuickLinkRow[]> {
    return [...this.quickLinks].sort((a, b) => a.position - b.position);
  }

  async countQuickLinks(): Promise<number> {
    return this.quickLinks.length;
  }

  async createQuickLink(data: {
    url: string;
    title: string;
    icon: string | null;
    color: string | null;
    position: number;
  }): Promise<QuickLinkRow> {
    const row: QuickLinkRow = {
      id: id(),
      url: data.url,
      title: data.title,
      icon: data.icon,
      color: data.color,
      position: data.position,
      createdAt: new Date(),
    };
    this.quickLinks.push(row);
    return row;
  }

  async updateQuickLink(id: string, data: Partial<QuickLinkRow>): Promise<QuickLinkRow> {
    const idx = this.quickLinks.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error("QuickLink not found");
    this.quickLinks[idx] = { ...this.quickLinks[idx], ...data };
    return this.quickLinks[idx];
  }

  async deleteQuickLink(id: string): Promise<void> {
    this.quickLinks = this.quickLinks.filter((r) => r.id !== id);
  }

  // --- Settings ---
  async findSettings(): Promise<SettingRow[]> {
    return Array.from(this.settings.entries()).map(([id, value]) => ({ id, value }));
  }

  async upsertSetting(opts: {
    where: { id: string };
    create: { id: string; value: string };
    update: { value: string };
  }): Promise<SettingRow> {
    this.settings.set(opts.where.id, opts.update.value);
    return { id: opts.where.id, value: opts.update.value };
  }
}

// Singleton — shared across all requests in the same process.
const globalForMemory = globalThis as unknown as { __veilMemDB?: MemoryDB };
export const memDB = globalForMemory.__veilMemDB ?? new MemoryDB();
globalForMemory.__veilMemDB = memDB;

/**
 * Get a DB-like object: either the real Prisma client or the in-memory fallback.
 * The returned object has `history`, `bookmark`, `quickLink`, `setting` properties
 * with methods matching the Prisma client API subset used by our routes.
 */
export function getDB() {
  // We re-import db lazily to avoid circular deps.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { db } = require("./db") as typeof import("./db");
  if (db) return db;

  // Return the memory DB wrapped to match Prisma's property names.
  return {
    history: {
      findMany: (opts?: Parameters<MemoryDB["findHistory"]>[0]) => memDB.findHistory(opts),
      findFirst: (opts: Parameters<MemoryDB["findFirstHistory"]>[0]) =>
        memDB.findFirstHistory(opts),
      create: (opts: { data: Parameters<MemoryDB["createHistory"]>[0] }) =>
        memDB.createHistory(opts.data),
      delete: (opts: { where: { id: string } }) => memDB.deleteHistory(opts.where.id),
      deleteMany: () => memDB.deleteManyHistory(),
    },
    bookmark: {
      findMany: () => memDB.findBookmarks(),
      findFirst: (opts: { where: { url: string } }) =>
        memDB.findFirstBookmark(opts),
      create: (opts: { data: Parameters<MemoryDB["createBookmark"]>[0] }) =>
        memDB.createBookmark(opts.data),
      delete: (opts: { where: { id: string } }) => memDB.deleteBookmark(opts.where.id),
      deleteMany: (opts: { where: { url: string } }) =>
        memDB.deleteManyBookmarks(opts),
    },
    quickLink: {
      findMany: () => memDB.findQuickLinks(),
      count: () => memDB.countQuickLinks(),
      create: (opts: { data: Parameters<MemoryDB["createQuickLink"]>[0] }) =>
        memDB.createQuickLink(opts.data),
      update: (opts: { where: { id: string }; data: Partial<QuickLinkRow> }) =>
        memDB.updateQuickLink(opts.where.id, opts.data),
      delete: (opts: { where: { id: string } }) => memDB.deleteQuickLink(opts.where.id),
    },
    setting: {
      findMany: () => memDB.findSettings(),
      upsert: (opts: Parameters<MemoryDB["upsertSetting"]>[0]) =>
        memDB.upsertSetting(opts),
    },
  };
}
