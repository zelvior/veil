/**
 * In-memory cookie jar for the proxy.
 *
 * Stores cookies per domain/path so that proxied sites that rely on
 * sessions (logins, preferences, CSRF tokens) actually work across
 * requests within the same server process.
 */

interface Cookie {
  name: string;
  value: string;
  /** Cookie domain, normalised to lowercase without leading dot. */
  domain: string;
  /** Cookie path, always starts with "/". */
  path: string;
  secure: boolean;
  /** Epoch ms when the cookie expires, or undefined for session cookies. */
  expires?: number;
  /** SameSite attribute (None/Lax/Strict) — informational only. */
  sameSite?: string;
}

// Global in-memory store. Persists for the lifetime of the Node process.
// Using globalThis ensures all API routes share the same jar even in
// Next.js dev mode where modules may be instantiated separately.
const globalForCookies = globalThis as unknown as {
  __proxyCookieJar?: Cookie[];
};
const jar: Cookie[] = globalForCookies.__proxyCookieJar ?? [];
globalForCookies.__proxyCookieJar = jar;

/** Normalise a cookie domain — strip leading dot, lowercase. */
function normalizeDomain(domain: string): string {
  return domain.replace(/^\./, "").toLowerCase();
}

/** Does `hostname` match the cookie's domain (including parent domains)? */
function domainMatches(hostname: string, cookieDomain: string): boolean {
  const h = hostname.toLowerCase();
  const d = cookieDomain.toLowerCase();
  if (h === d) return true;
  return h.endsWith("." + d);
}

/** Does `path` match the cookie's path? */
function pathMatches(requestPath: string, cookiePath: string): boolean {
  if (cookiePath === "/") return true;
  if (requestPath === cookiePath) return true;
  return requestPath.startsWith(cookiePath + "/");
}

/** Parse a single Set-Cookie header value into a Cookie. */
function parseSetCookie(header: string, requestUrl: string): Cookie | null {
  const parts = header.split(";");
  if (parts.length === 0) return null;
  const nv = parts[0].trim();
  const eq = nv.indexOf("=");
  if (eq === -1) return null;
  const name = nv.slice(0, eq).trim();
  let value = nv.slice(eq + 1).trim();
  if (!name) return null;
  // Strip surrounding quotes from value
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
  }

  const u = (() => {
    try {
      return new URL(requestUrl);
    } catch {
      return null;
    }
  })();
  if (!u) return null;

  let domain = normalizeDomain(u.hostname);
  let path = "/";
  let secure = false;
  let expires: number | undefined;
  let sameSite: string | undefined;

  for (let i = 1; i < parts.length; i++) {
    const p = parts[i].trim();
    const lower = p.toLowerCase();
    if (lower === "secure") {
      secure = true;
    } else if (lower === "httponly") {
      // irrelevant server-side
    } else if (lower.startsWith("domain=")) {
      domain = normalizeDomain(p.slice(7));
    } else if (lower.startsWith("path=")) {
      path = p.slice(5) || "/";
      if (!path.startsWith("/")) path = "/" + path;
    } else if (lower.startsWith("max-age=")) {
      const secs = parseInt(p.slice(8), 10);
      if (!isNaN(secs)) {
        if (secs <= 0) {
          expires = 0; // delete
        } else {
          expires = Date.now() + secs * 1000;
        }
      }
    } else if (lower.startsWith("expires=")) {
      const d = new Date(p.slice(8)).getTime();
      if (!isNaN(d)) expires = d;
    } else if (lower.startsWith("samesite=")) {
      sameSite = p.slice(9).trim();
    }
  }

  return { name, value, domain, path, secure, expires, sameSite };
}

/** Store cookies from a response's Set-Cookie headers. */
export function storeCookiesFromResponse(
  requestUrl: string,
  response: Response
): void {
  // Headers.getSetCookie() returns an array of individual Set-Cookie values.
  // Fallback: split the combined set-cookie header on commas (less reliable).
  let setCookies: string[] = [];
  const getSetCookie = (response.headers as unknown as {
    getSetCookie?: () => string[];
  }).getSetCookie;
  if (typeof getSetCookie === "function") {
    setCookies = getSetCookie.call(response.headers) ?? [];
  } else {
    const raw = response.headers.get("set-cookie");
    if (raw) setCookies = [raw];
  }
  for (const sc of setCookies) {
    const cookie = parseSetCookie(sc, requestUrl);
    if (!cookie) continue;
    // Remove any existing cookie with the same name+domain+path.
    for (let i = jar.length - 1; i >= 0; i--) {
      const c = jar[i];
      if (
        c.name === cookie.name &&
        c.domain === cookie.domain &&
        c.path === cookie.path
      ) {
        jar.splice(i, 1);
      }
    }
    // If the cookie is expired/deleted, don't re-add it.
    if (cookie.expires !== undefined && cookie.expires <= Date.now()) continue;
    jar.push(cookie);
  }
  // Periodically prune expired cookies to avoid unbounded growth.
  if (jar.length > 500) pruneExpired();
}

/**
 * Fetch a URL while manually following redirects so that Set-Cookie
 * headers on intermediate (3xx) responses are captured into the jar.
 * Returns the final Response (with the body unread).
 *
 * Node's built-in fetch with `redirect: "follow"` silently discards
 * Set-Cookie headers from redirect responses — this helper fixes that.
 */
export async function fetchWithCookies(
  url: string,
  init: RequestInit & { headers?: Record<string, string> }
): Promise<Response> {
  const MAX_REDIRECTS = 10;
  let currentUrl = url;
  let currentInit: RequestInit = { ...init, redirect: "manual" };

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    // Refresh the Cookie header for the current URL.
    const cookies = cookieHeaderFor(currentUrl);
    const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
    if (cookies) headers["Cookie"] = cookies;
    else delete headers["Cookie"];
    currentInit = { ...init, redirect: "manual", headers };

    const res = await fetch(currentUrl, currentInit);

    // Store any cookies from this response (including redirects).
    storeCookiesFromResponse(currentUrl, res);

    // If not a redirect, return the response.
    if (res.status < 300 || res.status >= 400) {
      return res;
    }

    // Follow the redirect manually.
    const location = res.headers.get("location");
    if (!location) return res; // malformed redirect
    currentUrl = resolveUrlSafe(location, currentUrl);
    // For 303, 301, 302 → switch to GET for the next request.
    if (res.status === 303 || (res.status !== 307 && res.status !== 308)) {
      currentInit = { ...currentInit, method: "GET", body: undefined };
    }
  }
  // Too many redirects — return last response
  return fetch(currentUrl, { ...init, redirect: "follow" });
}

function resolveUrlSafe(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

/** Build a Cookie header value for the given request URL. */
export function cookieHeaderFor(requestUrl: string): string {
  let u: URL;
  try {
    u = new URL(requestUrl);
  } catch {
    return "";
  }
  const now = Date.now();
  const matching = jar.filter(
    (c) =>
      domainMatches(u.hostname, c.domain) &&
      pathMatches(u.pathname, c.path) &&
      (!c.secure || u.protocol === "https:") &&
      (c.expires === undefined || c.expires > now)
  );
  if (matching.length === 0) return "";
  return matching.map((c) => `${c.name}=${c.value}`).join("; ");
}

/** Remove expired cookies from the jar. */
function pruneExpired(): void {
  const now = Date.now();
  for (let i = jar.length - 1; i >= 0; i--) {
    const c = jar[i];
    if (c.expires !== undefined && c.expires <= now) {
      jar.splice(i, 1);
    }
  }
}

/** Clear all stored cookies (used by "clear data" actions). */
export function clearAllCookies(): void {
  jar.length = 0;
}

/** Number of cookies currently stored (for debugging / UI). */
export function cookieCount(): number {
  return jar.length;
}
