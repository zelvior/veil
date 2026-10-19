/**
 * LRU Cache for proxied resources.
 *
 * Caches static resources (images, CSS, JS, fonts) that flow through the
 * proxy to avoid re-fetching them from the upstream on every request.
 * HTML pages are NOT cached (they change frequently and contain
 * session-specific data).
 *
 * Uses globalThis for cross-request sharing in Next.js dev/serverless.
 */

interface CacheEntry {
  body: Buffer;
  status: number;
  headers: [string, string][];
  cachedAt: number;
  size: number;
}

const MAX_ENTRIES = 500;
const MAX_MEMORY_BYTES = 100 * 1024 * 1024; // 100 MB
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

const globalForCache = globalThis as unknown as {
  __veilProxyCache?: Map<string, CacheEntry>;
  __veilCacheOrder?: string[];
  __veilCacheSize?: number;
};

const cache: Map<string, CacheEntry> = globalForCache.__veilProxyCache ?? new Map();
const order: string[] = globalForCache.__veilCacheOrder ?? [];
let totalSize: number = globalForCache.__veilCacheSize ?? 0;

globalForCache.__veilProxyCache = cache;
globalForCache.__veilCacheOrder = order;
globalForCache.__veilCacheSize = totalSize;

/**
 * Check if a content type should be cached.
 * HTML is never cached. Static assets (images, CSS, JS, fonts) are cached.
 */
export function shouldCache(contentType: string, status: number): boolean {
  if (status !== 200 && status !== 206) return false;
  const ct = contentType.toLowerCase();
  // Never cache HTML — it contains session-specific rewritten URLs
  if (ct.includes("text/html") || ct.includes("application/xhtml")) return false;
  // Cache static assets
  return (
    ct.includes("image/") ||
    ct.includes("text/css") ||
    ct.includes("javascript") ||
    ct.includes("ecmascript") ||
    ct.includes("font/") ||
    ct.includes("application/font") ||
    ct.includes("application/octet-stream") || // fonts often use this
    ct.includes("video/") ||
    ct.includes("audio/") ||
    ct.includes("application/json")
  );
}

/** Get a cached entry. Returns null if not found or expired. */
export function getCached(key: string, ttlMs: number = DEFAULT_TTL_MS): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > ttlMs) {
    // Expired — remove
    evict(key);
    return null;
  }
  // Move to end (most recently used)
  const idx = order.indexOf(key);
  if (idx !== -1) {
    order.splice(idx, 1);
    order.push(key);
  }
  return entry;
}

/** Store an entry in the cache, evicting LRU entries if needed. */
export function setCached(key: string, entry: Omit<CacheEntry, "cachedAt" | "size">): void {
  const size = entry.body.length;
  // Don't cache if the single entry is too large (> 10MB)
  if (size > 10 * 1024 * 1024) return;

  // Evict if we're over capacity
  while (
    (order.length >= MAX_ENTRIES || totalSize + size > MAX_MEMORY_BYTES) &&
    order.length > 0
  ) {
    const oldest = order[0];
    evict(oldest);
  }

  // If key already exists, remove old entry first
  if (cache.has(key)) evict(key);

  cache.set(key, { ...entry, cachedAt: Date.now(), size });
  order.push(key);
  totalSize += size;
}

/** Remove an entry from the cache. */
function evict(key: string): void {
  const entry = cache.get(key);
  if (!entry) return;
  cache.delete(key);
  const idx = order.indexOf(key);
  if (idx !== -1) order.splice(idx, 1);
  totalSize -= entry.size;
}

/** Build a cache key from the target URL and profile. */
export function buildCacheKey(targetUrl: string, profileId: string | null): string {
  return `${profileId || "default"}:${targetUrl}`;
}

/** Get cache stats (for debugging). */
export function cacheStats(): { entries: number; sizeBytes: number } {
  return { entries: cache.size, sizeBytes: totalSize };
}

/** Clear the entire cache. */
export function clearCache(): void {
  cache.clear();
  order.length = 0;
  totalSize = 0;
}
