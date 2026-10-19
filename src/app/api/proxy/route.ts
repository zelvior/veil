import { NextRequest, NextResponse } from "next/server";
import {
  decodeUrl,
  rewriteCss,
} from "@/lib/proxy";
import {
  rewriteHtml,
  rewriteJs,
  normalizeResponseHeaders,
  getProxyOrigin,
} from "@/lib/proxy-engine";
import {
  buildSecureUpstreamHeaders,
  anonymizeIncomingHeaders,
  fetchWithTlsFallback,
} from "@/lib/security-utils";
import { isTrackerRequest, blockedResponse } from "@/lib/tracker-blocker";
import {
  getOrCreateSession,
  fetchWithSessionCookies,
  sessionCookieHeaderFor,
  buildSessionCookieHeader,
  extractSessionId,
  clearSessionCookies,
  getSessionCookieName,
  type Session,
} from "@/lib/session-store";
import {
  shouldCache,
  getCached,
  setCached,
  buildCacheKey,
  type CacheEntry,
} from "@/lib/proxy-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Determine whether a content-type needs body rewriting (HTML/CSS/JS).
 * Everything else (images, video, fonts, JSON, etc.) is streamed as-is.
 */
function needsRewriting(contentType: string): boolean {
  const ct = contentType.toLowerCase();
  return (
    ct.includes("text/html") ||
    ct.includes("application/xhtml") ||
    ct.includes("text/css") ||
    ct.includes("javascript") ||
    ct.includes("ecmascript")
  );
}

/** Detect charset from a Content-Type header for correct HTML decoding. */
function getCharset(contentType: string): BufferEncoding {
  const m = /charset=["']?([\w-]+)/i.exec(contentType);
  return ((m?.[1] || "utf-8") as BufferEncoding) || "utf-8";
}

/**
 * A styled HTML error page returned when the upstream fetch fails.
 * Different icons and messages for different HTTP status codes.
 */
function errorPage(
  targetUrl: string,
  message: string,
  status: number,
  proxyOrigin: string,
  profileId: string | null
): NextResponse {
  const escapedUrl = targetUrl.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapedMsg = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Customize the error icon and color based on the status code.
  let icon = "!";
  let iconColor = "#dc2626";
  let iconBg = "#fee2e2";
  let title = `Unable to load page (HTTP ${status})`;
  if (status === 403) {
    icon = "🔒";
    title = "Access Blocked (403)";
  } else if (status === 404) {
    icon = "?";
    title = "Page Not Found (404)";
    iconColor = "#d97706";
    iconBg = "#fef3c7";
  } else if (status === 500) {
    icon = "⚠";
    title = "Server Error (500)";
  } else if (status === 502 || status === 504) {
    icon = "⚠";
    title = "Connection Failed";
  } else if (status === 408) {
    icon = "⏱";
    title = "Request Timeout";
  }

  const encodedUrl = Buffer.from(targetUrl).toString("base64url");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${title}</title>
<style>
*{box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:linear-gradient(135deg,#f5f7fa 0%,#e8edf3 100%);color:#1a1a1a;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px}
.card{max-width:480px;padding:40px 32px;border-radius:20px;background:#fff;box-shadow:0 8px 32px rgba(0,0,0,.1);text-align:center}
.icon{width:64px;height:64px;border-radius:50%;background:${iconBg};color:${iconColor};display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 20px;font-weight:bold}
h1{font-size:20px;margin:0 0 12px;color:#111}
.msg{color:#6b7280;font-size:14px;margin:0 0 8px;word-break:break-all;line-height:1.5}
.url{font-family:monospace;font-size:12px;color:#9ca3af;background:#f9fafb;padding:8px 12px;border-radius:8px;margin:12px 0;word-break:break-all}
.hint{margin-top:20px;font-size:12px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:20px;line-height:1.6}
.retry{display:inline-block;margin-top:20px;padding:10px 24px;border-radius:10px;background:#10b981;color:#fff;text-decoration:none;font-size:14px;font-weight:500;transition:background .2s}
.retry:hover{background:#059669}
.profiles{margin-top:12px;font-size:11px;color:#9ca3af}
</style></head><body><div class="card">
<div class="icon">${icon}</div>
<h1>${title}</h1>
<p class="msg">${escapedMsg}</p>
<div class="url">${escapedUrl}</div>
<div class="hint">The destination site may be blocking proxy requests, may be down, or may require a different browser profile. Try switching profiles in Settings, or try another site.</div>
<a class="retry" href="${proxyOrigin}/api/proxy?url=${encodedUrl}&ua=${encodeURIComponent(profileId || "")}">↻ Retry</a>
<div class="profiles">Tip: Different browser profiles (Chrome, Firefox, Safari, mobile) can bypass different blocking strategies.</div>
</div></body></html>`;
  return new NextResponse(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "frame-ancestors *",
      "X-Frame-Options": "ALLOWALL",
    },
  });
}

/**
 * Create a controlled ReadableStream that pumps data from an upstream
 * Response body. This is more reliable on serverless (Vercel) than
 * passing upstream.body directly — the underlying undici connection
 * can be torn down when the function returns, causing connection resets.
 *
 * Our stream stays alive until we explicitly close it, even if the
 * upstream connection drops mid-stream.
 */
function pumpStream(upstreamBody: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const reader = upstreamBody.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) controller.enqueue(value);
        }
        controller.close();
      } catch {
        // Upstream dropped — close gracefully so the client gets
        // whatever was sent so far instead of a connection reset.
        try { controller.close(); } catch { /* already closed */ }
      }
    },
    cancel() {
      try { upstreamBody.cancel(); } catch { /* ignore */ }
    },
  });
}

/**
 * Extract the target URL from the `url` query param.
 * Also collects any extra query params that should be forwarded to the
 * destination (e.g. from a GET form submission: ?url=ENCODED&q=test →
 * forward q=test to the target).
 */
function parseTargetUrl(
  searchParams: URLSearchParams
): {
  targetUrl: string;
  extraParams: URLSearchParams;
  blockRedirects: boolean;
  blockAds: boolean;
  trafficMask: boolean;
} {
  const raw = searchParams.get("url");
  if (!raw)
    return {
      targetUrl: "",
      extraParams: new URLSearchParams(),
      blockRedirects: true,
      blockAds: true,
      trafficMask: false,
    };

  const targetUrl = decodeUrl(raw);

  // Read feature flags from query params (sent by the client).
  const blockRedirects = searchParams.get("br") !== "0"; // default true
  const blockAds = searchParams.get("ba") !== "0"; // default true
  const trafficMask = searchParams.get("tm") === "1"; // default false

  // Collect extra params to forward (everything except our own control params).
  const extra = new URLSearchParams();
  const skip = new Set(["url", "ua", "br", "ba", "tm"]);
  searchParams.forEach((v, k) => {
    if (!skip.has(k)) extra.append(k, v);
  });

  return { targetUrl, extraParams: extra, blockRedirects, blockAds, trafficMask };
}

/**
 * Set the session cookie on a response if the session is new.
 * This ensures the client receives its __veil_sid cookie on the first
 * request, and subsequent requests carry it.
 */
function setSessionCookieIfNeeded(
  response: NextResponse,
  session: Session,
  isHttps: boolean,
  incomingCookie: string | null
): NextResponse {
  // If the incoming request already has the session cookie, no need to set it again.
  if (incomingCookie && extractSessionId(incomingCookie) === session.id) {
    return response;
  }
  response.headers.set(
    "Set-Cookie",
    buildSessionCookieHeader(session.id, isHttps)
  );
  return response;
}

/* ------------------------------------------------------------------ */
/* GET — page navigation, resource fetch, GET form submissions         */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  const proxyOrigin = getProxyOrigin(req.headers);
  const profileId = req.nextUrl.searchParams.get("ua");
  const isHttps =
    req.headers.get("x-forwarded-proto") === "https" ||
    req.nextUrl.protocol === "https:";

  // --- Session management: get or create an ephemeral session ---
  const incomingCookie = req.headers.get("cookie");
  const sessionId = extractSessionId(incomingCookie);
  const session = getOrCreateSession(sessionId);

  // --- Anonymize incoming headers (strip client IP/geo/identity) ---
  // This is done for hygiene — we don't forward client headers to the target,
  // but we call this to ensure no identifying info leaks even if we later
  // decide to merge incoming headers.
  anonymizeIncomingHeaders(req.headers);

  const { targetUrl, extraParams, blockRedirects, blockAds, trafficMask } = parseTargetUrl(req.nextUrl.searchParams);
  if (!targetUrl) {
    return NextResponse.json(
      { error: "Missing ?url= parameter" },
      { status: 400 }
    );
  }

  // --- Tracker blocking: if the target is a known tracker, return 204 ---
  if (isTrackerRequest(targetUrl)) {
    const res = new NextResponse(null, {
      status: 204,
      headers: { "X-Proxy-Blocked": "tracker" },
    });
    return setSessionCookieIfNeeded(res, session, isHttps, incomingCookie);
  }

  // If there are extra query params (e.g. from a GET form submission),
  // merge them into the target URL.
  let finalTarget = targetUrl;
  if (extraParams.toString()) {
    try {
      const dest = new URL(targetUrl);
      extraParams.forEach((v, k) => {
        if (!dest.searchParams.has(k)) dest.searchParams.append(k, v);
      });
      finalTarget = dest.toString();
    } catch {
      // ignore — keep original targetUrl
    }
  }

  // Determine if this is a document (HTML) navigation or a sub-resource.
  const fetchDest = req.headers.get("sec-fetch-dest") || "";
  const isDocument = fetchDest === "document" || fetchDest === "iframe";
  const cookieHeader = sessionCookieHeaderFor(session, finalTarget);
  const rangeHeader = req.headers.get("range");

  // --- Cache check: for non-document, non-Range requests, check the LRU cache ---
  // This avoids re-fetching + re-rewriting CSS/JS/images on every page load.
  const cacheKey = buildCacheKey(finalTarget, profileId);
  if (!isDocument && !rangeHeader) {
    const cached = getCached(cacheKey);
    if (cached) {
      // Cache hit — return the cached response immediately.
      const headers = new Headers(cached.headers);
      headers.set("X-Cache", "HIT");
      const res = new NextResponse(cached.body, {
        status: cached.status,
        headers,
      });
      return setSessionCookieIfNeeded(res, session, isHttps, incomingCookie);
    }
  }

  const upstreamHeaders = buildSecureUpstreamHeaders(
    finalTarget,
    profileId,
    cookieHeader,
    {
      isDocument,
      referer: finalTarget,
    }
  );

  // Forward the Range header for media seeking support.
  if (rangeHeader) {
    upstreamHeaders["Range"] = rangeHeader;
  }

  let upstream: Response;
  try {
    // Use session-scoped cookie management + TLS fallback for robustness.
    upstream = await fetchWithSessionCookies(
      session,
      finalTarget,
      { headers: upstreamHeaders }
    );
  } catch (err) {
    const msg = (err as Error).message;
    // Try TLS fallback for certificate errors.
    try {
      upstream = await fetchWithTlsFallback(finalTarget, {
        headers: upstreamHeaders,
      });
    } catch (err2) {
      const res = errorPage(
        finalTarget,
        `Connection failed: ${msg}. TLS fallback also failed: ${(err2 as Error).message}`,
        502,
        proxyOrigin,
        profileId
      );
      return setSessionCookieIfNeeded(res, session, isHttps, incomingCookie);
    }
  }

  const finalUrl = upstream.url || finalTarget;
  const contentType =
    upstream.headers.get("content-type") || "application/octet-stream";

  // --- Handle redirects that we didn't follow ---
  if (upstream.status >= 300 && upstream.status < 400) {
    const location = upstream.headers.get("location");
    const res = errorPage(
      finalTarget,
      `Too many redirects. Last redirect: ${location || "(none)"}`,
      502,
      proxyOrigin,
      profileId
    );
    return setSessionCookieIfNeeded(res, session, isHttps, incomingCookie);
  }

  // --- Non-2xx: styled error pages for documents, empty response for resources ---
  if (upstream.status >= 400) {
    if (isDocument) {
      const res = errorPage(
        finalTarget,
        `The destination server returned HTTP ${upstream.status}.`,
        upstream.status,
        proxyOrigin,
        profileId
      );
      return setSessionCookieIfNeeded(res, session, isHttps, incomingCookie);
    }
    // For non-document resources (fonts, images, etc.) that return errors,
    // return an empty response with the correct status code instead of the
    // upstream's HTML error page. This prevents "Failed to decode font" and
    // "OTS parsing error" console errors when a font/image 404s.
    const emptyHeaders = new Headers();
    emptyHeaders.set("Access-Control-Allow-Origin", "*");
    emptyHeaders.set("Content-Type", "application/octet-stream");
    emptyHeaders.set("Content-Length", "0");
    const res = new NextResponse(null, {
      status: upstream.status,
      headers: emptyHeaders,
    });
    return setSessionCookieIfNeeded(res, session, isHttps, incomingCookie);
  }

  // --- HTML / CSS / JS: buffer, rewrite (with tracker stripping), return ---
  if (needsRewriting(contentType)) {
    const buf = Buffer.from(await upstream.arrayBuffer());

    if (contentType.toLowerCase().includes("text/html") || contentType.toLowerCase().includes("application/xhtml")) {
      const charset = getCharset(contentType);
      const html = buf.toString(charset);
      // rewriteHtml now also strips tracker scripts and inline analytics.
      const rewritten = rewriteHtml({
        html,
        baseUrl: finalUrl,
        proxyOrigin,
        profileId,
        blockRedirects,
        blockAds,
        trafficMask,
      });
      const headers = normalizeResponseHeaders(upstream.headers, {
        rewritten: true,
      });
      headers.set("Content-Type", "text/html; charset=utf-8");
      headers.set("X-Proxied-Url", finalUrl);
      const res = new NextResponse(rewritten, { status: 200, headers });
      return setSessionCookieIfNeeded(res, session, isHttps, incomingCookie);
    }

    if (contentType.toLowerCase().includes("text/css")) {
      const css = buf.toString("utf-8");
      const rewritten = rewriteCss(css, finalUrl, proxyOrigin);
      const headers = normalizeResponseHeaders(upstream.headers, {
        rewritten: true,
      });
      headers.set("Content-Type", "text/css; charset=utf-8");
      headers.set("X-Proxied-Url", finalUrl);
      headers.set("Cache-Control", "public, max-age=300");
      headers.set("X-Cache", "MISS");
      // Store in server-side cache for 5 minutes
      if (shouldCache(contentType, upstream.status)) {
        const bodyBuf = Buffer.from(rewritten, "utf-8");
        setCached(cacheKey, {
          body: bodyBuf,
          status: 200,
          headers: Array.from(headers.entries()),
        });
      }
      const res = new NextResponse(rewritten, { status: 200, headers });
      return setSessionCookieIfNeeded(res, session, isHttps, incomingCookie);
    }

    // JavaScript
    const js = buf.toString("utf-8");
    const rewritten = rewriteJs(js, finalUrl, proxyOrigin);
    const headers = normalizeResponseHeaders(upstream.headers, {
      rewritten: true,
    });
    headers.set("Content-Type", "application/javascript; charset=utf-8");
    headers.set("X-Proxied-Url", finalUrl);
    headers.set("Cache-Control", "public, max-age=300");
    headers.set("X-Cache", "MISS");
    if (shouldCache(contentType, upstream.status)) {
      const bodyBuf = Buffer.from(rewritten, "utf-8");
      setCached(cacheKey, {
        body: bodyBuf,
        status: 200,
        headers: Array.from(headers.entries()),
      });
    }
    const res = new NextResponse(rewritten, { status: 200, headers });
    return setSessionCookieIfNeeded(res, session, isHttps, incomingCookie);
  }

  // --- Binary / media / other: STREAM via TransformStream ---
  // We DON'T pass upstream.body directly to NextResponse because on Vercel
  // serverless, the underlying undici connection gets torn down when the
  // function returns, causing "connection was reset" in the browser.
  //
  // Instead, we create a TransformStream and pump data from upstream.body
  // into it. This gives us a ReadableStream that we fully control — even
  // if the upstream connection closes, our stream stays alive until we
  // explicitly close it.
  const streamHeaders = normalizeResponseHeaders(upstream.headers, {
    rewritten: false,
    keepRangeHeaders: true,
  });
  streamHeaders.set("X-Proxied-Url", finalUrl);
  // Browser cache for static assets (images, fonts, media) — 10 minutes
  if (!rangeHeader && shouldCache(contentType, upstream.status)) {
    streamHeaders.set("Cache-Control", "public, max-age=600");
  }
  streamHeaders.set("X-Cache", "MISS");

  if (!streamHeaders.has("Accept-Ranges")) {
    streamHeaders.set("Accept-Ranges", "bytes");
  }

  const responseStatus = upstream.status;

  if (upstream.body) {
    const res = new NextResponse(pumpStream(upstream.body as ReadableStream<Uint8Array>), {
      status: responseStatus,
      headers: streamHeaders,
    });
    return setSessionCookieIfNeeded(res, session, isHttps, incomingCookie);
  }

  const res = new NextResponse(null, { status: responseStatus, headers: streamHeaders });
  return setSessionCookieIfNeeded(res, session, isHttps, incomingCookie);
}

/* ------------------------------------------------------------------ */
/* POST — form submissions and API calls                               */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  const proxyOrigin = getProxyOrigin(req.headers);
  const profileId = req.nextUrl.searchParams.get("ua");
  const isHttps =
    req.headers.get("x-forwarded-proto") === "https" ||
    req.nextUrl.protocol === "https:";

  const incomingCookie = req.headers.get("cookie");
  const sessionId = extractSessionId(incomingCookie);
  const session = getOrCreateSession(sessionId);
  anonymizeIncomingHeaders(req.headers);

  const { targetUrl, blockRedirects, blockAds, trafficMask } = parseTargetUrl(req.nextUrl.searchParams);
  if (!targetUrl) {
    return NextResponse.json(
      { error: "Missing ?url= parameter" },
      { status: 400 }
    );
  }

  // Tracker blocking
  if (isTrackerRequest(targetUrl)) {
    return new NextResponse(null, {
      status: 204,
      headers: { "X-Proxy-Blocked": "tracker" },
    });
  }

  const contentType =
    req.headers.get("content-type") || "application/x-www-form-urlencoded";
  const bodyBuf = Buffer.from(await req.arrayBuffer());

  // Detect if this POST is a form navigation (document) or an XHR/fetch
  // API call (resource). The browser's Sec-Fetch-Mode header tells us:
  //   "navigate" → form submission → use document headers
  //   "cors"/"same-origin"/"no-cors" → XHR/fetch → use resource headers
  const incomingFetchMode = req.headers.get("sec-fetch-mode") || "";
  const isDocumentPost = incomingFetchMode === "navigate";

  const cookieHeader = sessionCookieHeaderFor(session, targetUrl);
  const upstreamHeaders = buildSecureUpstreamHeaders(
    targetUrl,
    profileId,
    cookieHeader,
    { isDocument: isDocumentPost, referer: targetUrl }
  );
  upstreamHeaders["Content-Type"] = contentType;

  let upstream: Response;
  try {
    upstream = await fetchWithSessionCookies(session, targetUrl, {
      method: "POST",
      headers: upstreamHeaders,
      body: bodyBuf,
    });
  } catch (err) {
    const res = errorPage(
      targetUrl,
      `Connection failed: ${(err as Error).message}`,
      502,
      proxyOrigin,
      profileId
    );
    return setSessionCookieIfNeeded(res, session, isHttps, incomingCookie);
  }

  const finalUrl = upstream.url || targetUrl;
  const respContentType =
    upstream.headers.get("content-type") || "text/html; charset=utf-8";

  // If the POST response is HTML, rewrite it.
  if (
    respContentType.toLowerCase().includes("text/html") ||
    respContentType.toLowerCase().includes("application/xhtml")
  ) {
    const buf = Buffer.from(await upstream.arrayBuffer());
    const charset = getCharset(respContentType);
    const html = buf.toString(charset);
    const rewritten = rewriteHtml({
      html,
      baseUrl: finalUrl,
      proxyOrigin,
      profileId,
      blockRedirects: blockRedirects,
      blockAds: blockAds,
      trafficMask: trafficMask,
    });
    const headers = normalizeResponseHeaders(upstream.headers, {
      rewritten: true,
    });
    headers.set("Content-Type", "text/html; charset=utf-8");
    headers.set("X-Proxied-Url", finalUrl);
    const res = new NextResponse(rewritten, { status: 200, headers });
    return setSessionCookieIfNeeded(res, session, isHttps, incomingCookie);
  }

  // Non-HTML POST responses — stream directly.
  const streamHeaders = normalizeResponseHeaders(upstream.headers, {
    rewritten: false,
    keepRangeHeaders: true,
  });
  streamHeaders.set("X-Proxied-Url", finalUrl);
  if (upstream.body) {
    const res = new NextResponse(pumpStream(upstream.body as ReadableStream<Uint8Array>), {
      status: upstream.status,
      headers: streamHeaders,
    });
    return setSessionCookieIfNeeded(res, session, isHttps, incomingCookie);
  }
  const res = new NextResponse(null, { status: upstream.status, headers: streamHeaders });
  return setSessionCookieIfNeeded(res, session, isHttps, incomingCookie);
}

/* ------------------------------------------------------------------ */
/* PUT / PATCH / DELETE — forward to upstream                          */
/* ------------------------------------------------------------------ */

async function forwardWithBody(
  req: NextRequest,
  method: "PUT" | "PATCH" | "DELETE"
): Promise<NextResponse> {
  const proxyOrigin = getProxyOrigin(req.headers);
  const profileId = req.nextUrl.searchParams.get("ua");
  const isHttps =
    req.headers.get("x-forwarded-proto") === "https" ||
    req.nextUrl.protocol === "https:";

  const incomingCookie = req.headers.get("cookie");
  const sessionId = extractSessionId(incomingCookie);
  const session = getOrCreateSession(sessionId);
  anonymizeIncomingHeaders(req.headers);

  const { targetUrl, blockRedirects, blockAds, trafficMask } = parseTargetUrl(req.nextUrl.searchParams);
  if (!targetUrl) {
    return NextResponse.json(
      { error: "Missing ?url= parameter" },
      { status: 400 }
    );
  }

  if (isTrackerRequest(targetUrl)) {
    return new NextResponse(null, {
      status: 204,
      headers: { "X-Proxy-Blocked": "tracker" },
    });
  }

  const contentType =
    req.headers.get("content-type") || "application/octet-stream";
  const bodyBuf = Buffer.from(await req.arrayBuffer());

  const cookieHeader = sessionCookieHeaderFor(session, targetUrl);
  const upstreamHeaders = buildSecureUpstreamHeaders(
    targetUrl,
    profileId,
    cookieHeader,
    { isDocument: false, referer: targetUrl }
  );
  upstreamHeaders["Content-Type"] = contentType;

  let upstream: Response;
  try {
    upstream = await fetchWithSessionCookies(session, targetUrl, {
      method,
      headers: upstreamHeaders,
      body: bodyBuf.length > 0 ? bodyBuf : undefined,
    });
  } catch (err) {
    const res = errorPage(
      targetUrl,
      `Connection failed: ${(err as Error).message}`,
      502,
      proxyOrigin,
      profileId
    );
    return setSessionCookieIfNeeded(res, session, isHttps, incomingCookie);
  }

  const finalUrl = upstream.url || targetUrl;
  const streamHeaders = normalizeResponseHeaders(upstream.headers, {
    rewritten: false,
    keepRangeHeaders: true,
  });
  streamHeaders.set("X-Proxied-Url", finalUrl);
  if (upstream.body) {
    const res = new NextResponse(pumpStream(upstream.body as ReadableStream<Uint8Array>), {
      status: upstream.status,
      headers: streamHeaders,
    });
    return setSessionCookieIfNeeded(res, session, isHttps, incomingCookie);
  }
  const res = new NextResponse(null, { status: upstream.status, headers: streamHeaders });
  return setSessionCookieIfNeeded(res, session, isHttps, incomingCookie);
}

export async function PUT(req: NextRequest) {
  return forwardWithBody(req, "PUT");
}

export async function PATCH(req: NextRequest) {
  return forwardWithBody(req, "PATCH");
}

export async function DELETE(req: NextRequest) {
  return forwardWithBody(req, "DELETE");
}

/* ------------------------------------------------------------------ */
/* OPTIONS — CORS preflight                                            */
/* ------------------------------------------------------------------ */

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  });
}
