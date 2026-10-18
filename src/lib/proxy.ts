/**
 * Proxy core library
 * Handles URL encoding/decoding and rewriting HTML/CSS so that
 * every resource flows back through our proxy endpoints.
 */

const PROXY_FETCH = "/api/proxy/fetch";
const PROXY_RESOURCE = "/api/proxy/resource";

/* ------------------------------------------------------------------ */
/* URL encoding                                                        */
/* ------------------------------------------------------------------ */

/** Base64url encode a string (URL safe, no padding). */
export function encodeUrl(input: string): string {
  const b64 = Buffer.from(input, "utf-8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode a base64url string back to the original URL. */
export function decodeUrl(encoded: string): string {
  let b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return Buffer.from(b64, "base64").toString("utf-8");
}

/**
 * Build the proxied fetch URL for a given destination URL.
 * Uses a path segment (not a query param) so that GET-form submissions
 * work correctly: the browser appends the form's fields as the query
 * string, leaving the encoded destination URL untouched in the path.
 */
export function proxiedFetchUrl(url: string): string {
  return `${PROXY_FETCH}/${encodeUrl(url)}`;
}

/** Build the proxied resource URL for a given destination URL. */
export function proxiedResourceUrl(url: string): string {
  return `${PROXY_RESOURCE}?u=${encodeUrl(url)}`;
}

/* ------------------------------------------------------------------ */
/* URL resolution                                                      */
/* ------------------------------------------------------------------ */

/** Resolve a possibly-relative URL against a base. */
export function resolveUrl(raw: string, base: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return base;
  try {
    return new URL(trimmed, base).toString();
  } catch {
    return trimmed;
  }
}

/** Is this URL one we should proxy (http/https, not a data/blob/mailto)? */
export function isProxiable(url: string): boolean {
  if (!url) return false;
  const lower = url.trim().toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("blob:") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:") ||
    lower.startsWith("about:") ||
    lower.startsWith("#")
  ) {
    return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* CSS rewriting                                                       */
/* ------------------------------------------------------------------ */

/** Rewrite url(...) and @import statements inside a CSS string. */
export function rewriteCss(css: string, baseUrl: string): string {
  if (!css) return css;

  // Rewrite @import "..." / url(...)
  const rewrite = (match: string, quote: string) => {
    const raw = match.trim();
    let url = "";
    if (raw.startsWith("@import")) {
      url = raw.slice("@import".length).trim();
    } else {
      url = raw.slice("url(".length).trim();
    }
    if (quote) {
      url = url.slice(1, -1);
    } else {
      url = url.replace(/^["']|["']$/g, "");
    }
    url = url.trim();
    if (!url || !isProxiable(url)) return match;
    const resolved = resolveUrl(url, baseUrl);
    const proxied = proxiedResourceUrl(resolved);
    if (raw.startsWith("@import")) {
      return `@import ${quote}${proxied}${quote}`;
    }
    return `url(${quote}${proxied}${quote})`;
  };

  let out = css;
  // url("...") / url('...') / url(...)
  out = out.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q) => rewrite(m, q || ""));
  // @import "..." / @import '...' / @import url(...)
  out = out.replace(/@import\s+(['"])([^'"]+)\1/g, (m, q) => rewrite(m, q));
  return out;
}

/* ------------------------------------------------------------------ */
/* HTML rewriting (cheerio based)                                      */
/* ------------------------------------------------------------------ */

export interface RewriteResult {
  html: string;
  title: string;
  favicon: string | null;
  finalUrl: string;
  contentType: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Normalise a raw search/url bar input into a full URL. */
export function normaliseAddressInput(input: string, searchEngine: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  // Looks like a URL (has a scheme, or has a dot + no spaces)
  const looksLikeUrl =
    /^https?:\/\//i.test(trimmed) ||
    (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(trimmed) && !/\s/.test(trimmed));
  if (looksLikeUrl) {
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }
  return searchEngine.replace("{q}", encodeURIComponent(trimmed));
}

/** Extract a friendly hostname from a URL. */
export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Favicon URL (uses Google's favicon service). */
export function faviconFor(url: string): string {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch {
    return "";
  }
}
