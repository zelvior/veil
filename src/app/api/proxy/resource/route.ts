import { NextRequest, NextResponse } from "next/server";
import { resolveUrl, rewriteCss, proxiedResourceUrl, decodeUrl } from "@/lib/proxy";
import { getProfile } from "@/lib/browser-profiles";
import { cookieHeaderFor, fetchWithCookies } from "@/lib/cookie-jar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Build browser-like headers for a resource (sub-resource) request. */
function buildResourceHeaders(
  targetUrl: string,
  profileId: string | null,
  referer?: string
): Record<string, string> {
  const profile = getProfile(profileId);
  const headers: Record<string, string> = {
    "User-Agent": profile.userAgent,
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
  };
  if (profile.secChUa) headers["Sec-Ch-Ua"] = profile.secChUa;
  headers["Sec-Ch-Ua-Mobile"] = profile.mobile ? "?1" : "?0";
  if (profile.secChUaPlatform) headers["Sec-Ch-Ua-Platform"] = profile.secChUaPlatform;
  if (referer) headers["Referer"] = referer;
  const cookies = cookieHeaderFor(targetUrl);
  if (cookies) headers["Cookie"] = cookies;
  return headers;
}

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u");
  if (!u) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let targetUrl: string;
  try {
    targetUrl = decodeUrl(u);
  } catch {
    return NextResponse.json({ error: "Bad url encoding" }, { status: 400 });
  }

  const profileId = req.nextUrl.searchParams.get("ua");
  // The Referer header from the browser will be our own proxied URL;
  // use the target URL itself as the referer for the upstream request.
  const upstreamHeaders = buildResourceHeaders(targetUrl, profileId, targetUrl);

  let upstream: Response;
  try {
    upstream = await fetchWithCookies(targetUrl, {
      headers: upstreamHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Fetch failed", message: (err as Error).message },
      { status: 502 }
    );
  }

  // fetchWithCookies already stored cookies from redirect hops.
  const finalUrl = upstream.url || targetUrl;
  const contentType =
    upstream.headers.get("content-type") || "application/octet-stream";
  const buf = Buffer.from(await upstream.arrayBuffer());

  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  // Pass through caching headers
  const cacheControl = upstream.headers.get("cache-control");
  if (cacheControl) headers.set("Cache-Control", cacheControl);
  const etag = upstream.headers.get("etag");
  if (etag) headers.set("ETag", etag);

  const lower = contentType.toLowerCase();

  // Rewrite CSS
  if (lower.includes("css")) {
    const css = buf.toString("utf-8");
    headers.set("Content-Type", "text/css; charset=utf-8");
    headers.set("X-Proxied-Url", finalUrl);
    return new NextResponse(rewriteCss(css, finalUrl), { status: 200, headers });
  }

  // Rewrite JS (light touch — only absolute https URLs in string literals)
  if (lower.includes("javascript") || lower.includes("ecmascript")) {
    const js = buf.toString("utf-8");
    const patched = js.replace(
      /(["'`])(https?:\/\/[^"'`\s)]+)\1/g,
      (_m, q, url) => `${q}${proxiedResourceUrl(url)}${q}`
    );
    headers.set("Content-Type", "application/javascript; charset=utf-8");
    headers.set("X-Proxied-Url", finalUrl);
    return new NextResponse(patched, { status: 200, headers });
  }

  // Pass through everything else (images, fonts, json, etc.)
  headers.set("Content-Type", contentType);
  headers.set("X-Proxied-Url", finalUrl);
  return new NextResponse(buf, { status: 200, headers });
}

/**
 * POST handler — some JavaScript sends beacon/tracking POSTs to absolute
 * URLs that get rewritten to this route. Forward them and return the
 * response so the page doesn't see console errors.
 */
export async function POST(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u");
  if (!u) {
    return new NextResponse(null, { status: 204 });
  }
  let targetUrl: string;
  try {
    targetUrl = decodeUrl(u);
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const profileId = req.nextUrl.searchParams.get("ua");
  const contentType =
    req.headers.get("content-type") || "application/octet-stream";
  const bodyBuf = Buffer.from(await req.arrayBuffer());
  const upstreamHeaders = buildResourceHeaders(targetUrl, profileId, targetUrl);
  upstreamHeaders["Content-Type"] = contentType;
  try {
    const upstream = await fetchWithCookies(targetUrl, {
      method: "POST",
      headers: upstreamHeaders,
      body: bodyBuf,
    });
    const buf = Buffer.from(await upstream.arrayBuffer());
    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set(
      "Content-Type",
      upstream.headers.get("content-type") || "application/octet-stream"
    );
    return new NextResponse(buf, { status: upstream.status, headers });
  } catch {
    // Swallow errors for tracking beacons — they're non-essential.
    return new NextResponse(null, { status: 204 });
  }
}

/** OPTIONS handler — CORS preflight. */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
