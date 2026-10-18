/**
 * Ephemeral Session Store — Isolated, per-session cookie storage.
 *
 * Provides privacy-isolated "sessions" so each user gets their own
 * cookie jar. Cookies from one user's session are never visible to
 * another user's session, preventing cross-site tracking via the proxy.
 *
 * Sessions are identified by a random, opaque token stored in a
 * __veil_sid cookie. The token itself carries no user data — it's
 * just a lookup key into the in-memory session map.
 *
 * Sessions expire after 30 minutes of inactivity to limit memory
 * usage and improve privacy (stale sessions are pruned).
 *
 * SERVER-ONLY.
 */

import { Cookie, storeCookiesFromResponse, cookieHeaderFor as globalCookieHeaderFor } from "./cookie-jar";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Session {
  /** Random opaque session ID. */
  id: string;
  /** Per-session cookie jar (isolated from other sessions). */
  cookies: Cookie[];
  /** Last activity timestamp (epoch ms). */
  lastActivity: number;
}

/* ------------------------------------------------------------------ */
/* Session store                                                       */
/* ------------------------------------------------------------------ */

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_COOKIE_NAME = "__veil_sid";

// Global session map, shared across all API routes via globalThis.
const globalForSessions = globalThis as unknown as {
  __veilSessions?: Map<string, Session>;
};
const sessions: Map<string, Session> =
  globalForSessions.__veilSessions ?? new Map();
globalForSessions.__veilSessions = sessions;

/**
 * Get or create a session for the given session ID.
 * If no ID is provided (or the session doesn't exist / expired),
 * a new session is created.
 */
export function getOrCreateSession(sessionId?: string | null): Session {
  // Prune expired sessions on each access (cheap O(n) scan).
  pruneExpiredSessions();

  if (sessionId) {
    const existing = sessions.get(sessionId);
    if (existing) {
      existing.lastActivity = Date.now();
      return existing;
    }
  }

  // Create a new session.
  const id = generateSessionId();
  const session: Session = {
    id,
    cookies: [],
    lastActivity: Date.now(),
  };
  sessions.set(id, session);
  return session;
}

/**
 * Generate a cryptographically random session ID (32 hex chars = 128 bits).
 */
function generateSessionId(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { randomBytes } = require("node:crypto") as typeof import("node:crypto");
  return randomBytes(16).toString("hex");
}

/**
 * Remove sessions that have been inactive for longer than the timeout.
 */
function pruneExpiredSessions(): void {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
      sessions.delete(id);
    }
  }
}

/**
 * Store cookies from an upstream response into the session's jar.
 * This is the session-scoped equivalent of cookie-jar's storeCookiesFromResponse.
 */
export function storeSessionCookies(
  session: Session,
  requestUrl: string,
  response: Response
): void {
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

    // Remove existing cookie with same name+domain+path.
    for (let i = session.cookies.length - 1; i >= 0; i--) {
      const c = session.cookies[i];
      if (
        c.name === cookie.name &&
        c.domain === cookie.domain &&
        c.path === cookie.path
      ) {
        session.cookies.splice(i, 1);
      }
    }

    if (cookie.expires !== undefined && cookie.expires <= Date.now()) continue;
    session.cookies.push(cookie);
  }
}

/**
 * Build a Cookie header for the given request URL from the session's jar.
 */
export function sessionCookieHeaderFor(session: Session, requestUrl: string): string {
  let u: URL;
  try {
    u = new URL(requestUrl);
  } catch {
    return "";
  }
  const now = Date.now();
  const matching = session.cookies.filter(
    (c) =>
      domainMatches(u.hostname, c.domain) &&
      pathMatches(u.pathname, c.path) &&
      (!c.secure || u.protocol === "https:") &&
      (c.expires === undefined || c.expires > now)
  );
  if (matching.length === 0) return "";
  return matching.map((c) => `${c.name}=${c.value}`).join("; ");
}

/**
 * Fetch a URL while manually following redirects, using the SESSION's
 * cookie jar (not the global jar). This ensures per-user isolation.
 */
export async function fetchWithSessionCookies(
  session: Session,
  url: string,
  init: RequestInit & { headers?: Record<string, string> }
): Promise<Response> {
  const MAX_REDIRECTS = 10;
  let currentUrl = url;

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const cookies = sessionCookieHeaderFor(session, currentUrl);
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string>),
    };
    if (cookies) headers["Cookie"] = cookies;
    else delete headers["Cookie"];

    const res = await fetch(currentUrl, {
      ...init,
      redirect: "manual",
      headers,
    });

    storeSessionCookies(session, currentUrl, res);

    if (res.status < 300 || res.status >= 400) {
      return res;
    }

    const location = res.headers.get("location");
    if (!location) return res;
    try {
      currentUrl = new URL(location, currentUrl).toString();
    } catch {
      return res;
    }

    if (res.status === 303 || (res.status !== 307 && res.status !== 308)) {
      init = { ...init, method: "GET", body: undefined };
    }
  }
  return fetch(currentUrl, { ...init, redirect: "follow" });
}

/**
 * Clear all cookies in a session (logout / privacy clear).
 */
export function clearSessionCookies(session: Session): void {
  session.cookies.length = 0;
}

/**
 * Get the number of active sessions (for debugging / UI).
 */
export function sessionCount(): number {
  pruneExpiredSessions();
  return sessions.size;
}

/**
 * Get the session cookie name (for setting on responses).
 */
export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

/**
 * Build the Set-Cookie header value for the session cookie.
 * Uses HttpOnly, Secure (in production), SameSite=Lax, and a 1-day max-age.
 */
export function buildSessionCookieHeader(sessionId: string, isHttps: boolean): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${sessionId}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${24 * 60 * 60}`, // 1 day
  ];
  if (isHttps) parts.push("Secure");
  return parts.join("; ");
}

/**
 * Extract the session ID from the incoming request's Cookie header.
 */
export function extractSessionId(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;\\s]+)`));
  return match ? match[1] : null;
}

/* ------------------------------------------------------------------ */
/* Cookie parsing (mirrors cookie-jar.ts but session-scoped)           */
/* ------------------------------------------------------------------ */

interface CookiePartial {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  expires?: number;
}

function parseSetCookie(header: string, requestUrl: string): CookiePartial | null {
  const parts = header.split(";");
  if (parts.length === 0) return null;
  const nv = parts[0].trim();
  const eq = nv.indexOf("=");
  if (eq === -1) return null;
  const name = nv.slice(0, eq).trim();
  let value = nv.slice(eq + 1).trim();
  if (!name) return null;
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);

  let u: URL;
  try {
    u = new URL(requestUrl);
  } catch {
    return null;
  }

  let domain = u.hostname.replace(/^\./, "").toLowerCase();
  let path = "/";
  let secure = false;
  let expires: number | undefined;

  for (let i = 1; i < parts.length; i++) {
    const p = parts[i].trim();
    const lower = p.toLowerCase();
    if (lower === "secure") secure = true;
    else if (lower.startsWith("domain=")) domain = p.slice(7).replace(/^\./, "").toLowerCase();
    else if (lower.startsWith("path=")) {
      path = p.slice(5) || "/";
      if (!path.startsWith("/")) path = "/" + path;
    } else if (lower.startsWith("max-age=")) {
      const secs = parseInt(p.slice(8), 10);
      if (!isNaN(secs)) expires = secs <= 0 ? 0 : Date.now() + secs * 1000;
    } else if (lower.startsWith("expires=")) {
      const d = new Date(p.slice(8)).getTime();
      if (!isNaN(d)) expires = d;
    }
  }

  return { name, value, domain, path, secure, expires };
}

function domainMatches(hostname: string, cookieDomain: string): boolean {
  const h = hostname.toLowerCase();
  const d = cookieDomain.toLowerCase();
  if (h === d) return true;
  return h.endsWith("." + d);
}

function pathMatches(requestPath: string, cookiePath: string): boolean {
  if (cookiePath === "/") return true;
  if (requestPath === cookiePath) return true;
  return requestPath.startsWith(cookiePath + "/");
}
