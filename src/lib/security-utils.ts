/**
 * Security Utilities — Header sanitization, IP anonymization, TLS handling.
 *
 * This module centralizes all security-critical transformations:
 *   • anonymizeIncomingHeaders — strip client IP/geo headers before forwarding
 *   • buildSecureUpstreamHeaders — realistic, non-leaking request headers
 *   • fetchWithTlsFallback — retry with relaxed TLS on cert errors
 *   • isTrackerDomain — checks against the tracker blocklist
 *
 * SERVER-ONLY.
 */

import { getProfile } from "./browser-profiles";

/* ------------------------------------------------------------------ */
/* Incoming header sanitization (privacy)                              */
/* ------------------------------------------------------------------ */

/**
 * Client-identifying headers that must NEVER be forwarded to the target.
 * These would leak the user's real IP, proxy chain, or geolocation.
 */
const CLIENT_IDENTITY_HEADERS = [
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
  "x-client-ip",
  "x-cluster-client-ip",
  "x-forwarded",
  "forwarded",
  "via",
  "x-geo-country",
  "x-geo-region",
  "x-geo-city",
  "x-geo-latitude",
  "x-geo-longitude",
  "x-amzn-trace-id",
  "x-request-id",
  "x-correlation-id",
  "cf-connecting-ip",
  "cf-ipcountry",
  "cf-ray",
  "true-client-ip",
  "fastly-client-ip",
  "x-akamai-config-log-detail",
];

/**
 * Remove all client-identifying headers from the incoming request
 * before building the upstream request. This ensures the target server
 * cannot see the user's real IP, geolocation, or proxy chain.
 *
 * Returns a fresh Headers object with only safe, non-identifying headers.
 */
export function anonymizeIncomingHeaders(incoming: Headers): Headers {
  const clean = new Headers();
  incoming.forEach((value, key) => {
    if (!CLIENT_IDENTITY_HEADERS.includes(key.toLowerCase())) {
      // Don't copy headers that fetchWithCookies will set itself.
      const lower = key.toLowerCase();
      if (
        lower === "host" ||
        lower === "connection" ||
        lower === "content-length" ||
        lower === "transfer-encoding" ||
        lower === "cookie" // managed by cookie-jar, not forwarded from client
      ) {
        return;
      }
      clean.set(key, value);
    }
  });
  return clean;
}

/* ------------------------------------------------------------------ */
/* Upstream request header construction (anti-bot + privacy)           */
/* ------------------------------------------------------------------ */

/**
 * Build a realistic, non-leaking set of request headers for the upstream
 * fetch. These headers mimic a real browser to avoid anti-bot detection
 * while ensuring no client-identifying information leaks through.
 *
 * @param targetUrl     The destination URL.
 * @param profileId     Browser profile ID (determines UA + Sec-Ch-Ua).
 * @param cookieHeader  Cookies from our jar (not the client's cookies).
 * @param opts          Request context (document vs resource, referer).
 */
export function buildSecureUpstreamHeaders(
  targetUrl: string,
  profileId: string | null | undefined,
  cookieHeader: string,
  opts: { isDocument: boolean; referer?: string }
): Record<string, string> {
  const profile = getProfile(profileId);

  const headers: Record<string, string> = {
    "User-Agent": profile.userAgent,
    "Accept-Language": pickAcceptLanguage(),
    "Accept-Encoding": "gzip, deflate, br",
    "Sec-Ch-Ua-Mobile": profile.mobile ? "?1" : "?0",
    "Sec-Fetch-Dest": opts.isDocument ? "document" : "empty",
    "Sec-Fetch-Mode": opts.isDocument ? "navigate" : "cors",
    "Sec-Fetch-Site": opts.referer ? "same-origin" : "none",
  };

  if (profile.secChUa) headers["Sec-Ch-Ua"] = profile.secChUa;
  if (profile.secChUaPlatform) headers["Sec-Ch-Ua-Platform"] = profile.secChUaPlatform;

  if (opts.isDocument) {
    headers["Accept"] =
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,application/signed-exchange;v=b3;q=0.7,*/*;q=0.8";
    headers["Upgrade-Insecure-Requests"] = "1";
    headers["Sec-Fetch-User"] = "?1";
  } else {
    headers["Accept"] = "*/*";
  }

  if (opts.referer) {
    // Use the target URL as the referer — NOT the proxy origin or client URL.
    // This prevents the target from seeing our proxy domain in the Referer.
    headers["Referer"] = opts.referer;
  }

  if (cookieHeader) {
    headers["Cookie"] = cookieHeader;
  }

  // DNT (Do Not Track) — signals privacy preference; harmless to send.
  headers["DNT"] = "1";

  return headers;
}

/**
 * Rotate Accept-Language values to avoid fingerprinting.
 * Returns one of several common language preference strings.
 */
function pickAcceptLanguage(): string {
  const langs = [
    "en-US,en;q=0.9",
    "en-US,en;q=0.5",
    "en-GB,en;q=0.9,en-US;q=0.8",
    "en,en-US;q=0.9",
    "en-US,en;q=0.9,es;q=0.8",
  ];
  return langs[Math.floor(Math.random() * langs.length)];
}

/* ------------------------------------------------------------------ */
/* TLS / SSL fallback handling                                         */
/* ------------------------------------------------------------------ */

/**
 * Fetch a URL with graceful TLS error handling.
 *
 * Node's fetch rejects on self-signed or expired certificates by default.
 * In a proxy context, we want to attempt the fetch, and if TLS fails,
 * retry with a custom HTTPS agent that allows invalid certificates.
 *
 * This prevents top-level runtime errors from crashing the route handler.
 *
 * @param url    The target URL (must be https: for TLS fallback to apply).
 * @param init   Fetch init (headers, method, body).
 * @returns      The upstream Response.
 */
export async function fetchWithTlsFallback(
  url: string,
  init: RequestInit & { headers?: Record<string, string> }
): Promise<Response> {
  try {
    // First attempt: normal fetch (strict TLS).
    return await fetch(url, { ...init, redirect: "manual" });
  } catch (err) {
    const msg = (err as Error).message || "";

    // Check if this is a TLS/certificate error.
    const isTlsError =
      msg.includes("certificate") ||
      msg.includes("CERT") ||
      msg.includes("ssl") ||
      msg.includes("tls") ||
      msg.includes("UNABLE_TO_VERIFY") ||
      msg.includes("self signed") ||
      msg.includes("unable to verify the first certificate");

    if (!isTlsError) {
      // Not a TLS error — re-throw so the caller handles it.
      throw err;
    }

    // TLS fallback: use Node's https module with rejectUnauthorized: false.
    // We do this by creating a custom agent and passing it via a Node-specific
    // dispatch option. This is the cleanest way in Node 18+.
    try {
      const https = await import("node:https");
      const agent = new https.Agent({
        rejectUnauthorized: false,
      });
      // Node's fetch supports the `dispatcher` option via undici, but the
      // simplest cross-version approach is to use node:https directly for
      // the fallback.
      return await fetchViaHttpsModule(url, init, agent);
    } catch {
      // If the fallback also fails, throw the original error.
      throw err;
    }
  }
}

/**
 * Fallback fetch using node:https module directly for TLS-error cases.
 * This bypasses the strict TLS checks in Node's fetch.
 */
async function fetchViaHttpsModule(
  url: string,
  init: RequestInit & { headers?: Record<string, string> },
  agent: import("node:https").Agent
): Promise<Response> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const https = require("node:https") as typeof import("node:https");
    const urlObj = new URL(url);

    const options: import("node:https").RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: (init.method as string) || "GET",
      headers: init.headers as Record<string, string>,
      agent,
    };

    const req = https.request(options, (res) => {
      // Collect the response body into a buffer, then construct a Response.
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      res.on("end", () => {
        const body = Buffer.concat(chunks);
        const responseHeaders = new Headers();
        Object.entries(res.headers || {}).forEach(([k, v]) => {
          if (Array.isArray(v)) {
            v.forEach((vv) => responseHeaders.append(k, vv));
          } else if (v !== undefined) {
            responseHeaders.set(k, v);
          }
        });
        // Create a ReadableStream from the buffer for streaming compatibility.
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(body));
            controller.close();
          },
        });
        resolve(
          new Response(stream, {
            status: res.statusCode || 200,
            headers: responseHeaders,
          })
        );
      });
    });

    req.on("error", reject);

    // Set a timeout to avoid hanging on unresponsive servers.
    req.setTimeout(30000, () => {
      req.destroy(new Error("Request timeout (30s)"));
    });

    if (init.body) {
      if (typeof init.body === "string") {
        req.write(init.body);
      } else if (init.body instanceof Buffer) {
        req.write(init.body);
      }
    }
    req.end();
  });
}

/* ------------------------------------------------------------------ */
/* Tracker / ad domain blocklist                                       */
/* ------------------------------------------------------------------ */

/**
 * Domains known to serve ads, tracking, telemetry, or analytics.
 * Requests to these domains are blocked at the proxy level (returned
 * as a 204 No Content) and their <script> tags are stripped from HTML.
 *
 * This list focuses on the most common trackers. It's intentionally
 * conservative to avoid breaking legitimate functionality.
 */
const TRACKER_DOMAINS = new Set([
  // Google
  "google-analytics.com",
  "googletagmanager.com",
  "googlesyndication.com",
  "doubleclick.net",
  "googleadservices.com",
  "adservice.google.com",
  "ads.google.com",
  "g.doubleclick.net",
  "stats.g.doubleclick.net",
  "www.googletagmanager.com",
  "www.google-analytics.com",
  // Facebook
  "connect.facebook.net",
  "www.facebook.com",
  "graph.facebook.com",
  // Twitter/X
  "ads-twitter.com",
  "analytics.twitter.com",
  // Microsoft
  "bat.bing.com",
  "clarity.ms",
  // Other major trackers
  "scorecardresearch.com",
  "quantserve.com",
  "hotjar.com",
  "mixpanel.com",
  "segment.io",
  "amplitude.com",
  "fullstory.com",
  "logrocket.com",
  "sentry.io",
  "newrelic.com",
  "rum.browser-intake-datadoghq.com",
  "browser-intake-datadoghq.com",
  // Ad networks
  "adsystem.com",
  "adnxs.com",
  "criteo.com",
  "taboola.com",
  "outbrain.com",
  "pubmatic.com",
  "rubiconproject.com",
  "openx.net",
  "casalemedia.com",
  "3lift.com",
  // Telemetry
  "telemetry.soundcloud.com",
  "events.reddit.com",
  // Common fingerprinting
  "fingerprintjs.com",
  "deviceatlas.com",
]);

/**
 * Check if a URL points to a known tracker/ad domain.
 * Matches on the hostname and all parent domains.
 */
export function isTrackerDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    // Check the full hostname and progressively strip subdomains.
    let domain = hostname;
    while (domain) {
      if (TRACKER_DOMAINS.has(domain)) return true;
      const dot = domain.indexOf(".");
      if (dot === -1) break;
      domain = domain.slice(dot + 1);
      // Stop at TLD level (e.g., "com" is not a tracker).
      if (!domain.includes(".")) break;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Get the count of blocked tracker domains (for UI display).
 */
export function trackerBlocklistSize(): number {
  return TRACKER_DOMAINS.size;
}
