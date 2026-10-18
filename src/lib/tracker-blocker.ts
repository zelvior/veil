/**
 * Tracker & Ad Blocking Engine — DOM-level and request-level filtering.
 *
 * This module provides:
 *   • stripTrackersFromHtml — removes <script>, <iframe>, <img>, <link>
 *     elements that point to known tracker/ad domains.
 *   • stripTrackerInlineScripts — removes inline analytics snippets
 *     (e.g., Google Analytics, Facebook Pixel) by pattern-matching.
 *   • isTrackerRequest — checks if a request URL should be blocked.
 *   • blockedResponse — returns a minimal 204 for blocked requests.
 *
 * SERVER-ONLY (imports cheerio).
 */

import * as cheerio from "cheerio";
import { isTrackerDomain } from "./security-utils";

/* ------------------------------------------------------------------ */
/* DOM-level tracker stripping                                         */
/* ------------------------------------------------------------------ */

/**
 * Remove tracker/ad elements from an already-loaded cheerio document.
 * This is called AFTER URL rewriting, so script src attributes already
 * point to /api/proxy?url=<encoded>. We decode them to check the domain.
 *
 * Removes:
 *   - <script src="tracker"> tags (external tracker scripts)
 *   - <iframe src="tracker"> tags (ad iframes)
 *   - <img src="tracker"> tags (tracking pixels)
 *   - <link href="tracker"> tags (preconnect/dns-prefetch to trackers)
 *   - Inline <script> blocks matching known analytics snippets
 *
 * @param $  The cheerio instance (mutated in place).
 * @returns  Number of elements removed.
 */
export function stripTrackersFromHtml($: cheerio.CheerioAPI): number {
  let removed = 0;

  // --- External script/iframe/img/link tags pointing to trackers ---
  const urlAttrs: Array<{ selector: string; attr: string }> = [
    { selector: "script[src]", attr: "src" },
    { selector: "iframe[src]", attr: "src" },
    { selector: "img[src]", attr: "src" },
    { selector: "img[data-src]", attr: "data-src" },
    { selector: "link[href]", attr: "href" },
    { selector: "embed[src]", attr: "src" },
    { selector: "object[data]", attr: "data" },
  ];

  for (const { selector, attr } of urlAttrs) {
    $(selector).each((_, el) => {
      const node = $(el);
      const val = node.attr(attr);
      if (!val) return;

      // Decode the proxy URL to get the original target URL.
      const originalUrl = decodeProxyUrl(val);
      if (!originalUrl) return;

      if (isTrackerDomain(originalUrl)) {
        node.remove();
        removed++;
      }
    });
  }

  // --- Inline script blocks with known analytics snippets ---
  removed += stripTrackerInlineScripts($);

  // --- <link rel="preconnect"> / <link rel="dns-prefetch"> to trackers ---
  $('link[rel="preconnect"], link[rel="dns-prefetch"]').each((_, el) => {
    const node = $(el);
    const href = node.attr("href");
    if (href && isTrackerDomain(href)) {
      node.remove();
      removed++;
    }
  });

  // --- <meta http-equiv="refresh"> redirects to trackers ---
  $('meta[http-equiv="refresh"]').each((_, el) => {
    const node = $(el);
    const content = node.attr("content") || "";
    // Format: "0;url=https://tracker.com/..."
    const match = content.match(/url=['"]?([^'"\s]+)/i);
    if (match && isTrackerDomain(match[1])) {
      node.remove();
      removed++;
    }
  });

  return removed;
}

/**
 * Remove inline <script> blocks that contain known analytics/tracking
 * snippets. These don't have src attributes — the tracking code is
 * embedded directly in the HTML.
 */
function stripTrackerInlineScripts($: cheerio.CheerioAPI): number {
  let removed = 0;

  // Patterns that identify inline tracker scripts.
  const TRACKER_PATTERNS = [
    /google[_-]?analytics/i,
    /gtag\(/i,
    /googletagmanager/i,
    /fbq\(/i, // Facebook Pixel
    /facebook.*pixel/i,
    /_fbq/i,
    /twq\(/i, // Twitter pixel
    /hotjar/i,
    /mixpanel/i,
    /amplitude/i,
    /fullstory/i,
    /logrocket/i,
    /sentry\./i,
    /newrelic/i,
    /clarity\./i,
    /scorecardresearch/i,
    /quantserve/i,
    /criteo/i,
    /taboola/i,
    /outbrain/i,
    /dataLayer\.push/i,
    /_paq\.push/i, // Matomo/Piwik
    /heap\.io/i,
    /segment\.analytics/i,
    /\.track\(['"]/i,
  ];

  $("script:not([src])").each((_, el) => {
    const node = $(el);
    const code = node.html() || "";
    if (!code.trim()) return;

    for (const pattern of TRACKER_PATTERNS) {
      if (pattern.test(code)) {
        node.remove();
        removed++;
        break;
      }
    }
  });

  return removed;
}

/* ------------------------------------------------------------------ */
/* Request-level blocking                                              */
/* ------------------------------------------------------------------ */

/**
 * Check if an incoming proxy request should be blocked (i.e., the target
 * URL is a known tracker/ad domain). Returns true if the request should
 * be blocked.
 */
export function isTrackerRequest(targetUrl: string): boolean {
  return isTrackerDomain(targetUrl);
}

/**
 * Build a minimal blocking response for tracker requests.
 * Returns 204 No Content with CORS headers so the browser doesn't
 * show console errors for the blocked request.
 */
export function blockedResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Content-Type": "text/plain",
      "Access-Control-Allow-Origin": "*",
      "X-Proxy-Blocked": "tracker",
    },
  });
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Decode a proxy URL (e.g., /api/proxy?url=<base64>) back to the
 * original target URL. Returns null if the URL is not a proxy URL
 * or can't be decoded.
 */
function decodeProxyUrl(proxyUrl: string): string | null {
  try {
    const u = new URL(proxyUrl, "http://placeholder.local");
    const encoded = u.searchParams.get("url");
    if (!encoded) return null;
    // base64url decode
    let b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    return Buffer.from(b64, "base64").toString("utf-8");
  } catch {
    // Might be a relative URL without a query param — check if it's
    // directly a tracker domain.
    try {
      const u = new URL(proxyUrl, "http://placeholder.local");
      return u.href;
    } catch {
      return null;
    }
  }
}
