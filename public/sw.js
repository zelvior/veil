/**
 * Veil Service Worker
 *
 * Caching strategy:
 * - App shell (HTML, JS, CSS, fonts): cache-first with network fallback
 * - Static assets (images, icons): cache-first
 * - API routes (/api/*): network-only (never cache — dynamic data)
 * - Proxy routes (/api/proxy*): network-only (never cache — dynamic content)
 * - Legal pages: stale-while-revalidate
 *
 * The SW does NOT cache proxied website content — that's handled by the
 * proxy server's own LRU cache + browser HTTP cache headers.
 */

const SW_VERSION = "v1.0.0";
const APP_SHELL_CACHE = `veil-shell-${SW_VERSION}`;
const ASSET_CACHE = `veil-assets-${SW_VERSION}`;
const LEGAL_CACHE = `veil-legal-${SW_VERSION}`;

// Resources to pre-cache on install (the app shell).
const APP_SHELL = [
  "/",
  "/logo.png",
  "/favicon.png",
  "/favicon-32.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/manifest.json",
];

// Install: pre-cache the app shell.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(() => {
        // If pre-caching fails (e.g., some resources 404), continue anyway.
        // The SW will cache them on-demand as they're fetched.
      })
  );
});

// Activate: clean up old caches.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![APP_SHELL_CACHE, ASSET_CACHE, LEGAL_CACHE].includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: route-based caching strategy.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests.
  if (request.method !== "GET") return;

  // Skip cross-origin requests (let the browser handle them).
  if (url.origin !== self.location.origin) return;

  // --- API routes: network-only (never cache) ---
  if (url.pathname.startsWith("/api/")) {
    return; // Let the browser handle it — no SW intervention.
  }

  // --- Legal pages: stale-while-revalidate ---
  if (url.pathname.startsWith("/legal")) {
    event.respondWith(staleWhileRevalidate(request, LEGAL_CACHE));
    return;
  }

  // --- Navigation requests (HTML pages): network-first, fallback to cache ---
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the latest version of the app shell.
          const clone = response.clone();
          caches.open(APP_SHELL_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          // Offline — serve from cache, or the cached "/" as fallback.
          return caches.match(request).then(
            (cached) => cached || caches.match("/")
          );
        })
    );
    return;
  }

  // --- Static assets (JS, CSS, fonts, images): cache-first ---
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/__next/") ||
    url.pathname.match(/\.(js|css|woff2?|ttf|eot|png|jpg|jpeg|gif|svg|ico|webp)$/i)
  ) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  // --- Everything else: try cache, then network ---
  event.respondWith(cacheFirst(request, ASSET_CACHE));
});

/**
 * Cache-first strategy: serve from cache if available, otherwise fetch
 * from network and cache the response.
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      const cache = await caches.open(cacheName);
      cache.put(request, clone);
    }
    return response;
  } catch (e) {
    // Offline and not in cache — return nothing.
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

/**
 * Stale-while-revalidate: serve from cache immediately, then fetch from
 * network to update the cache for next time.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkFetch;
}

// --- Message handler: allow the app to trigger cache cleanup ---
self.addEventListener("message", (event) => {
  if (event.data === "CLEAR_CACHES") {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(keys.map((key) => caches.delete(key)))
      )
    );
  }
});
