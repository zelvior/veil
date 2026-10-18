import { NextRequest, NextResponse } from "next/server";
import { resolveUrl, rewriteCss, proxiedResourceUrl } from "@/lib/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u");
  if (!u) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let targetUrl: string;
  try {
    targetUrl = Buffer.from(
      u.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf-8");
  } catch {
    return NextResponse.json({ error: "Bad url encoding" }, { status: 400 });
  }

  const customUa = req.nextUrl.searchParams.get("ua") || DEFAULT_UA;

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      headers: {
        "User-Agent": customUa,
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: targetUrl,
      },
      redirect: "follow",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Fetch failed", message: (err as Error).message },
      { status: 502 }
    );
  }

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

  // Rewrite JS (light touch - only absolute https URLs in string literals)
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
