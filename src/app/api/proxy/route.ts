import { NextRequest, NextResponse } from "next/server";
import {
  decodeUrl,
  resolveUrl,
  rewriteCss,
} from "@/lib/proxy";
import {
  rewriteHtml,
  rewriteJs,
  normalizeResponseHeaders,
  buildUpstreamHeaders,
  getProxyOrigin,
} from "@/lib/proxy-engine";
import { fetchWithCookies, cookieHeaderFor } from "@/lib/cookie-jar";

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

/** A styled HTML error page returned when the upstream fetch fails. */
function errorPage(
  targetUrl: string,
  message: string,
  status: number,
  proxyOrigin: string,
  profileId: string | null
): NextResponse {
  const escapedUrl = targetUrl.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapedMsg = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Proxy Error</title>
<style>
body{font-family:system-ui,sans-serif;background:#fafafa;color:#1a1a1a;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{max-width:480px;padding:32px;border-radius:16px;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center}
.icon{width:56px;height:56px;border-radius:50%;background:#fee2e2;color:#dc2626;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 16px}
h1{font-size:20px;margin:0 0 8px} p{color:#6b7280;font-size:14px;margin:0 0 6px;word-break:break-all}
.url{font-family:monospace;font-size:12px;color:#9ca3af}
.hint{margin-top:16px;font-size:12px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px}
.retry{display:inline-block;margin-top:16px;padding:8px 20px;border-radius:8px;background:#10b981;color:#fff;text-decoration:none;font-size:14px}
</style></head><body><div class="card">
<div class="icon">!</div>
<h1>Unable to load page (HTTP ${status})</h1>
<p class="url">${escapedUrl}</p>
<p>${escapedMsg}</p>
<div class="hint">The destination site may be blocking proxy requests, or may be down. Try a different browser profile in Settings, or try another site.</div>
<a class="retry" href="${proxyOrigin}/api/proxy?url=${Buffer.from(targetUrl).toString("base64url")}&ua=${encodeURIComponent(profileId || "")}">Retry</a>
</div></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
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
): { targetUrl: string; extraParams: URLSearchParams } {
  const raw = searchParams.get("url");
  if (!raw) return { targetUrl: "", extraParams: new URLSearchParams() };

  const targetUrl = decodeUrl(raw);

  // Collect extra params to forward (everything except our own control params).
  const extra = new URLSearchParams();
  const skip = new Set(["url", "ua"]);
  searchParams.forEach((v, k) => {
    if (!skip.has(k)) extra.append(k, v);
  });

  return { targetUrl, extraParams: extra };
}

/* ------------------------------------------------------------------ */
/* GET — page navigation, resource fetch, GET form submissions         */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  const proxyOrigin = getProxyOrigin(req.headers);
  const profileId = req.nextUrl.searchParams.get("ua");

  const { targetUrl, extraParams } = parseTargetUrl(req.nextUrl.searchParams);
  if (!targetUrl) {
    return NextResponse.json(
      { error: "Missing ?url= parameter" },
      { status: 400 }
    );
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
  // The Sec-Fetch-Dest header from the browser tells us:
  //   "document" → main page navigation → use document headers
  //   anything else → sub-resource → use resource headers
  const fetchDest = req.headers.get("sec-fetch-dest") || "";
  const isDocument = fetchDest === "document" || fetchDest === "iframe";
  const cookieHeader = cookieHeaderFor(finalTarget);
  const rangeHeader = req.headers.get("range");

  const upstreamHeaders = buildUpstreamHeaders(
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
    upstream = await fetchWithCookies(finalTarget, {
      headers: upstreamHeaders,
    });
  } catch (err) {
    return errorPage(
      finalTarget,
      `Connection failed: ${(err as Error).message}`,
      502,
      proxyOrigin,
      profileId
    );
  }

  const finalUrl = upstream.url || finalTarget;
  const contentType =
    upstream.headers.get("content-type") || "application/octet-stream";

  // --- Handle redirects that we didn't follow (opaque redirect) ---
  // fetchWithCookies follows redirects, but if the final response is still
  // a redirect (e.g. too many hops), return an error page.
  if (upstream.status >= 300 && upstream.status < 400) {
    const location = upstream.headers.get("location");
    return errorPage(
      finalTarget,
      `Too many redirects. Last redirect: ${location || "(none)"}`,
      502,
      proxyOrigin,
      profileId
    );
  }

  // --- Non-2xx responses: pass through for resources, show error for pages ---
  // For media/resources, pass through the error status so the browser
  // handles it correctly. For HTML navigations, show our error page.
  if (upstream.status >= 500 && isDocument) {
    return errorPage(
      finalTarget,
      `Upstream server returned HTTP ${upstream.status}.`,
      upstream.status,
      proxyOrigin,
      profileId
    );
  }

  // --- HTML / CSS / JS: buffer, rewrite, return ---
  if (needsRewriting(contentType)) {
    const buf = Buffer.from(await upstream.arrayBuffer());

    if (contentType.toLowerCase().includes("text/html") || contentType.toLowerCase().includes("application/xhtml")) {
      const charset = getCharset(contentType);
      const html = buf.toString(charset);
      const rewritten = rewriteHtml({
        html,
        baseUrl: finalUrl,
        proxyOrigin,
        profileId,
      });
      const headers = normalizeResponseHeaders(upstream.headers, {
        rewritten: true,
      });
      headers.set("Content-Type", "text/html; charset=utf-8");
      headers.set("X-Proxied-Url", finalUrl);
      return new NextResponse(rewritten, { status: 200, headers });
    }

    if (contentType.toLowerCase().includes("text/css")) {
      const css = buf.toString("utf-8");
      const rewritten = rewriteCss(css, finalUrl, proxyOrigin);
      const headers = normalizeResponseHeaders(upstream.headers, {
        rewritten: true,
      });
      headers.set("Content-Type", "text/css; charset=utf-8");
      headers.set("X-Proxied-Url", finalUrl);
      return new NextResponse(rewritten, { status: 200, headers });
    }

    // JavaScript
    const js = buf.toString("utf-8");
    const rewritten = rewriteJs(js, finalUrl, proxyOrigin);
    const headers = normalizeResponseHeaders(upstream.headers, {
      rewritten: true,
    });
    headers.set("Content-Type", "application/javascript; charset=utf-8");
    headers.set("X-Proxied-Url", finalUrl);
    return new NextResponse(rewritten, { status: 200, headers });
  }

  // --- Binary / media / other: STREAM directly from upstream ---
  // This is critical for large files and video/audio: we pipe the
  // ReadableStream from the upstream response directly to the client
  // without buffering the entire body into memory.
  //
  // For Range requests (206 Partial Content), we forward the status code,
  // Content-Range, and Accept-Ranges headers so the browser can seek.
  const streamHeaders = normalizeResponseHeaders(upstream.headers, {
    rewritten: false,
    keepRangeHeaders: true,
  });
  streamHeaders.set("X-Proxied-Url", finalUrl);

  // Ensure Accept-Ranges is advertised so the browser knows it can seek.
  if (!streamHeaders.has("Accept-Ranges")) {
    streamHeaders.set("Accept-Ranges", "bytes");
  }

  // Forward 206 Partial Content status for Range requests.
  const responseStatus = upstream.status;

  // If the upstream returned a ReadableStream body, pipe it directly.
  // This enables zero-buffering streaming for video, audio, and large files.
  if (upstream.body) {
    // Convert the upstream ReadableStream to a Web ReadableStream.
    // Node's fetch body is already a Web ReadableStream<Uint8Array>.
    return new NextResponse(upstream.body as ReadableStream<Uint8Array>, {
      status: responseStatus,
      headers: streamHeaders,
    });
  }

  // Fallback: no body (e.g. HEAD response or empty 204).
  return new NextResponse(null, { status: responseStatus, headers: streamHeaders });
}

/* ------------------------------------------------------------------ */
/* POST — form submissions and API calls                               */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  const proxyOrigin = getProxyOrigin(req.headers);
  const profileId = req.nextUrl.searchParams.get("ua");
  const { targetUrl } = parseTargetUrl(req.nextUrl.searchParams);

  if (!targetUrl) {
    return NextResponse.json(
      { error: "Missing ?url= parameter" },
      { status: 400 }
    );
  }

  const contentType =
    req.headers.get("content-type") || "application/x-www-form-urlencoded";
  const bodyBuf = Buffer.from(await req.arrayBuffer());

  const cookieHeader = cookieHeaderFor(targetUrl);
  const upstreamHeaders = buildUpstreamHeaders(
    targetUrl,
    profileId,
    cookieHeader,
    { isDocument: true, referer: targetUrl }
  );
  upstreamHeaders["Content-Type"] = contentType;

  let upstream: Response;
  try {
    upstream = await fetchWithCookies(targetUrl, {
      method: "POST",
      headers: upstreamHeaders,
      body: bodyBuf,
    });
  } catch (err) {
    return errorPage(
      targetUrl,
      `Connection failed: ${(err as Error).message}`,
      502,
      proxyOrigin,
      profileId
    );
  }

  const finalUrl = upstream.url || targetUrl;
  const respContentType =
    upstream.headers.get("content-type") || "text/html; charset=utf-8";

  // If the POST response is HTML, rewrite it (common for form confirmations).
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
    });
    const headers = normalizeResponseHeaders(upstream.headers, {
      rewritten: true,
    });
    headers.set("Content-Type", "text/html; charset=utf-8");
    headers.set("X-Proxied-Url", finalUrl);
    return new NextResponse(rewritten, { status: 200, headers });
  }

  // Non-HTML POST responses (e.g. JSON API responses) — stream directly.
  const streamHeaders = normalizeResponseHeaders(upstream.headers, {
    rewritten: false,
    keepRangeHeaders: true,
  });
  streamHeaders.set("X-Proxied-Url", finalUrl);
  if (upstream.body) {
    return new NextResponse(upstream.body as ReadableStream<Uint8Array>, {
      status: upstream.status,
      headers: streamHeaders,
    });
  }
  return new NextResponse(null, { status: upstream.status, headers: streamHeaders });
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
  const { targetUrl } = parseTargetUrl(req.nextUrl.searchParams);

  if (!targetUrl) {
    return NextResponse.json(
      { error: "Missing ?url= parameter" },
      { status: 400 }
    );
  }

  const contentType =
    req.headers.get("content-type") || "application/octet-stream";
  const bodyBuf = Buffer.from(await req.arrayBuffer());

  const cookieHeader = cookieHeaderFor(targetUrl);
  const upstreamHeaders = buildUpstreamHeaders(
    targetUrl,
    profileId,
    cookieHeader,
    { isDocument: false, referer: targetUrl }
  );
  upstreamHeaders["Content-Type"] = contentType;

  let upstream: Response;
  try {
    upstream = await fetchWithCookies(targetUrl, {
      method,
      headers: upstreamHeaders,
      body: bodyBuf.length > 0 ? bodyBuf : undefined,
    });
  } catch (err) {
    return errorPage(
      targetUrl,
      `Connection failed: ${(err as Error).message}`,
      502,
      proxyOrigin,
      profileId
    );
  }

  const finalUrl = upstream.url || targetUrl;
  const streamHeaders = normalizeResponseHeaders(upstream.headers, {
    rewritten: false,
    keepRangeHeaders: true,
  });
  streamHeaders.set("X-Proxied-Url", finalUrl);
  if (upstream.body) {
    return new NextResponse(upstream.body as ReadableStream<Uint8Array>, {
      status: upstream.status,
      headers: streamHeaders,
    });
  }
  return new NextResponse(null, { status: upstream.status, headers: streamHeaders });
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
