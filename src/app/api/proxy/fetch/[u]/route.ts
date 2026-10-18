import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import {
  encodeUrl,
  resolveUrl,
  isProxiable,
  proxiedFetchUrl,
  proxiedResourceUrl,
  rewriteCss,
  decodeUrl,
} from "@/lib/proxy";
import { getProfile } from "@/lib/browser-profiles";
import { cookieHeaderFor, fetchWithCookies } from "@/lib/cookie-jar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Allow long-running upstream fetches (some sites are slow).
export const maxDuration = 30;

/* ------------------------------------------------------------------ */
/* Bootstrap script (injected into every proxied HTML page)           */
/* ------------------------------------------------------------------ */

const BOOTSTRAP_TEMPLATE = `
<script>
(function(){
  var PROXY_URL = "__PROXY_URL__";
  var PROXY_FETCH_PREFIX = "__PROXY_FETCH_PREFIX__";
  function send(){ try{ parent.postMessage({ __proxy:true, type:'navigate', url: PROXY_URL, title: document.title }, '*'); }catch(e){} }
  function hookHistory(fn){ var orig=history[fn]; history[fn]=function(){ orig.apply(this,arguments); send(); }; }
  hookHistory('pushState'); hookHistory('replaceState');
  window.addEventListener('popstate', send);
  window.addEventListener('load', send);
  window.open = function(u){ if(u){ try{ parent.postMessage({ __proxy:true, type:'open', url: u }, '*'); }catch(e){} } return null; };
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest && e.target.closest('a');
    if(!a) return;
    var href = a.getAttribute('href');
    if(!href) return;
    if(a.target === '_blank' || a.target === '_top' || a.target === '_parent'){
      e.preventDefault();
      try{ parent.postMessage({ __proxy:true, type:'open', url: a.href }, '*'); }catch(err){}
    }
  }, true);
  // Intercept fetch/XHR so absolute https URLs are routed through the resource proxy.
  if(window.fetch){
    var origFetch = window.fetch;
    window.fetch = function(input, init){
      try {
        var url = typeof input === 'string' ? input : (input && input.url);
        if(url && /^https?:\\/\\//.test(url)){
          var proxied = PROXY_FETCH_PREFIX.replace('__ENC__', btoa(url).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,''));
          if(typeof input === 'string'){ input = proxied; }
          else if(input && input.url){ input = new Request(proxied, input); }
        }
      } catch(e){}
      return origFetch.call(this, input, init);
    };
  }
  if(window.XMLHttpRequest){
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url){
      try {
        if(url && /^https?:\\/\\//.test(url)){
          var proxied = PROXY_FETCH_PREFIX.replace('__ENC__', btoa(url).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,''));
          url = proxied;
        }
      } catch(e){}
      return origOpen.apply(this, arguments);
    };
  }
  setTimeout(send, 300);
  setTimeout(send, 1500);
})();
</script>`;

function buildBootstrap(realUrl: string): string {
  const safeUrl = realUrl
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/<\/script>/gi, "<\\/script>");
  const prefix = "/api/proxy/resource?u=__ENC__";
  return BOOTSTRAP_TEMPLATE.replace(/__PROXY_URL__/g, safeUrl).replace(
    /__PROXY_FETCH_PREFIX__/g,
    prefix.replace(/\\/g, "\\\\")
  );
}

/* ------------------------------------------------------------------ */
/* HTML rewriting                                                      */
/* ------------------------------------------------------------------ */

interface RewriteOpts {
  body: Buffer;
  contentType: string;
  baseUrl: string;
}

function rewriteHtml({ body, contentType, baseUrl }: RewriteOpts): string {
  const charsetMatch = /charset=["']?([\w-]+)/i.exec(contentType);
  const charset = (charsetMatch?.[1] || "utf-8") as BufferEncoding;
  const html = body.toString(charset);
  const $ = cheerio.load(html, { decodeEntities: false });
  const bootstrap = buildBootstrap(baseUrl);

  const rewriteAttr = (val: string): string => {
    if (!val || !isProxiable(val)) return val;
    const resolved = resolveUrl(val, baseUrl);
    return proxiedFetchUrl(resolved);
  };

  const rewriteResourceAttr = (val: string): string => {
    if (!val || !isProxiable(val)) return val;
    const resolved = resolveUrl(val, baseUrl);
    return proxiedResourceUrl(resolved);
  };

  const rewriteSrcset = (val: string): string => {
    if (!val) return val;
    return val
      .split(",")
      .map((part) => {
        const seg = part.trim();
        if (!seg) return seg;
        const [url, ...descriptor] = seg.split(/\s+/);
        if (!isProxiable(url)) return seg;
        const resolved = resolveUrl(url, baseUrl);
        return `${proxiedResourceUrl(resolved)} ${descriptor.join(" ")}`.trim();
      })
      .join(", ");
  };

  // <a href>
  $("a[href]").each((_, el) => {
    const node = $(el);
    node.attr("href", rewriteAttr(node.attr("href") || ""));
  });
  // <area href>
  $("area[href]").each((_, el) => {
    const node = $(el);
    node.attr("href", rewriteAttr(node.attr("href") || ""));
  });
  // <form action> — keep method intact so POST works through this route
  $("form[action]").each((_, el) => {
    const node = $(el);
    node.attr("action", rewriteAttr(node.attr("action") || ""));
  });

  // <link href>
  $("link[href]").each((_, el) => {
    const node = $(el);
    const rel = (node.attr("rel") || "").toLowerCase();
    const val = node.attr("href") || "";
    if (!val || !isProxiable(val)) return;
    const resolved = resolveUrl(val, baseUrl);
    if (
      rel.includes("stylesheet") ||
      rel.includes("icon") ||
      rel.includes("shortcut") ||
      rel.includes("preload") ||
      rel.includes("prefetch") ||
      rel.includes("manifest")
    ) {
      node.attr("href", proxiedResourceUrl(resolved));
    } else {
      node.attr("href", proxiedFetchUrl(resolved));
    }
  });

  // <script src>
  $("script[src]").each((_, el) => {
    const node = $(el);
    node.attr("src", rewriteResourceAttr(node.attr("src") || ""));
  });

  // images / media
  $("img").each((_, el) => {
    const node = $(el);
    node.attr("src", rewriteResourceAttr(node.attr("src") || ""));
    const ds = node.attr("data-src");
    if (ds) node.attr("data-src", rewriteResourceAttr(ds));
    const ss = node.attr("srcset");
    if (ss) node.attr("srcset", rewriteSrcset(ss));
  });
  $("[srcset]").each((_, el) => {
    const node = $(el);
    if (el.tagName === "img") return;
    node.attr("srcset", rewriteSrcset(node.attr("srcset") || ""));
  });
  $(
    "source[src], video[src], video[poster], audio[src], track[src], embed[src], object[data], input[src], input[formaction], button[formaction]"
  ).each((_, el) => {
    const node = $(el);
    ["src", "poster", "data", "formaction"].forEach((a) => {
      const v = node.attr(a);
      if (v) node.attr(a, rewriteResourceAttr(v));
    });
  });

  // <iframe src>
  $("iframe[src]").each((_, el) => {
    const node = $(el);
    node.attr("src", rewriteAttr(node.attr("src") || ""));
  });

  // svg <image> and <use>
  $("image[href], use[href]").each((_, el) => {
    const node = $(el);
    node.attr("href", rewriteResourceAttr(node.attr("href") || ""));
  });

  // remove <base> (we resolve against the real URL)
  $("base").remove();

  // <style> blocks
  $("style").each((_, el) => {
    const node = $(el);
    const txt = node.html();
    if (txt) node.html(rewriteCss(txt, baseUrl));
  });

  // style="" attributes
  $("[style]").each((_, el) => {
    const node = $(el);
    const style = node.attr("style");
    if (style) node.attr("style", rewriteCss(style, baseUrl));
  });

  // Remove integrity / nonce checks that would break rewritten resources
  $("[integrity]").removeAttr("integrity");
  $("[nonce]").removeAttr("nonce");
  // CSP meta tags interfere with our injected script
  $('meta[http-equiv="Content-Security-Policy"]').remove();

  // Inject bootstrap right before </body> (or append to root)
  const bodyEl = $("body");
  if (bodyEl.length) bodyEl.append(bootstrap);
  else $.root().append(bootstrap);

  return $.html();
}

function rewriteNonHtml(
  body: Buffer,
  contentType: string,
  baseUrl: string
): { body: Buffer; contentType: string } {
  const ct = contentType.toLowerCase();
  if (ct.includes("css")) {
    const css = body.toString("utf-8");
    return { body: Buffer.from(rewriteCss(css, baseUrl), "utf-8"), contentType };
  }
  if (ct.includes("javascript") || ct.includes("ecmascript")) {
    const js = body.toString("utf-8");
    const patched = js.replace(
      /(["'`])(https?:\/\/[^"'`\s)]+)\1/g,
      (_m, q, url) => `${q}${proxiedResourceUrl(url)}${q}`
    );
    return { body: Buffer.from(patched, "utf-8"), contentType };
  }
  return { body, contentType };
}

/* ------------------------------------------------------------------ */
/* Request helpers                                                     */
/* ------------------------------------------------------------------ */

/** Build the full set of browser-like headers for a page navigation. */
function buildPageHeaders(
  targetUrl: string,
  profileId: string | null,
  referer?: string
): Record<string, string> {
  const profile = getProfile(profileId);
  const headers: Record<string, string> = {
    "User-Agent": profile.userAgent,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,application/signed-exchange;v=b3;q=0.7,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": referer ? "same-origin" : "none",
    "Sec-Fetch-User": "?1",
  };
  if (profile.secChUa) headers["Sec-Ch-Ua"] = profile.secChUa;
  headers["Sec-Ch-Ua-Mobile"] = profile.mobile ? "?1" : "?0";
  if (profile.secChUaPlatform) headers["Sec-Ch-Ua-Platform"] = profile.secChUaPlatform;
  if (referer) headers["Referer"] = referer;
  // Forward cookies from the jar
  const cookies = cookieHeaderFor(targetUrl);
  if (cookies) headers["Cookie"] = cookies;
  return headers;
}

/** Build the full set of browser-like headers for a resource request. */
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

/* ------------------------------------------------------------------ */
/* Error page                                                          */
/* ------------------------------------------------------------------ */

function errorPage(targetUrl: string, message: string, status: number): NextResponse {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Proxy Error</title>
<style>
  body{font-family:system-ui,sans-serif;background:#fafafa;color:#1a1a1a;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .card{max-width:480px;padding:32px;border-radius:16px;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center}
  .icon{width:56px;height:56px;border-radius:50%;background:#fee2e2;color:#dc2626;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 16px}
  h1{font-size:20px;margin:0 0 8px}
  p{color:#6b7280;font-size:14px;margin:0 0 6px;word-break:break-all}
  .url{font-family:monospace;font-size:12px;color:#9ca3af}
  .hint{margin-top:16px;font-size:12px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px}
</style></head>
<body><div class="card">
  <div class="icon">!</div>
  <h1>Unable to load page (HTTP ${status})</h1>
  <p class="url">${targetUrl.replace(/</g, "&lt;")}</p>
  <p>${message.replace(/</g, "&lt;")}</p>
  <div class="hint">The destination site may be blocking proxy requests, or may be down. Try a different browser profile in Settings, or try another site.</div>
</div></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/* ------------------------------------------------------------------ */
/* GET handler — page navigation + GET form submissions                */
/* ------------------------------------------------------------------ */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ u: string }> }
) {
  const { u: encoded } = await params;
  if (!encoded) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let targetUrl: string;
  try {
    targetUrl = decodeUrl(encoded);
  } catch {
    return NextResponse.json({ error: "Bad url encoding" }, { status: 400 });
  }

  const profileId = req.nextUrl.searchParams.get("ua");
  // If the browser navigated here via a GET form submission, the form's
  // fields are in the query string of THIS request. Forward them to the
  // destination URL.
  const incomingQuery = new URLSearchParams(req.nextUrl.searchParams);
  incomingQuery.delete("ua"); // our own param, not part of the destination
  if (incomingQuery.toString()) {
    try {
      const dest = new URL(targetUrl);
      // Merge: destination query takes precedence to avoid duplication,
      // but we append incoming fields that don't already exist.
      incomingQuery.forEach((v, k) => {
        if (!dest.searchParams.has(k)) dest.searchParams.append(k, v);
      });
      targetUrl = dest.toString();
    } catch {
      // ignore
    }
  }

  const upstreamHeaders = buildPageHeaders(targetUrl, profileId, targetUrl);

  let upstream: Response;
  try {
    upstream = await fetchWithCookies(targetUrl, {
      headers: upstreamHeaders,
    });
  } catch (err) {
    return errorPage(
      targetUrl,
      `Connection failed: ${(err as Error).message}`,
      502
    );
  }

  // fetchWithCookies already stored cookies from all redirect hops.
  const finalUrl = upstream.url || targetUrl;
  const contentType =
    upstream.headers.get("content-type") || "text/html; charset=utf-8";
  const buf = Buffer.from(await upstream.arrayBuffer());

  // If the upstream returned an error status, but it's still HTML, we
  // rewrite and return it (many sites serve a usable error page).
  if (upstream.status >= 500) {
    return errorPage(targetUrl, `Upstream server error (${upstream.status}).`, upstream.status);
  }

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("X-Proxied-Url", finalUrl);
  headers.set("Access-Control-Allow-Origin", "*");

  const lower = contentType.toLowerCase();
  if (lower.includes("text/html") || lower.includes("application/xhtml")) {
    const rewritten = rewriteHtml({ body: buf, contentType, baseUrl: finalUrl });
    headers.set("Content-Type", "text/html; charset=utf-8");
    return new NextResponse(rewritten, { status: 200, headers });
  }

  const { body: outBody, contentType: outCt } = rewriteNonHtml(
    buf,
    contentType,
    finalUrl
  );
  headers.set("Content-Type", outCt);
  return new NextResponse(outBody, { status: 200, headers });
}

/* ------------------------------------------------------------------ */
/* POST handler — form submissions                                     */
/* ------------------------------------------------------------------ */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ u: string }> }
) {
  const { u: encoded } = await params;
  if (!encoded) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let targetUrl: string;
  try {
    targetUrl = decodeUrl(encoded);
  } catch {
    return NextResponse.json({ error: "Bad url encoding" }, { status: 400 });
  }

  const profileId = req.nextUrl.searchParams.get("ua");
  const contentType =
    req.headers.get("content-type") || "application/x-www-form-urlencoded";
  const bodyBuf = Buffer.from(await req.arrayBuffer());

  const upstreamHeaders = buildPageHeaders(targetUrl, profileId, targetUrl);
  upstreamHeaders["Content-Type"] = contentType;
  if (contentType.includes("urlencoded")) {
    upstreamHeaders["Content-Type"] =
      "application/x-www-form-urlencoded";
  }

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
      502
    );
  }

  const finalUrl = upstream.url || targetUrl;
  const respContentType =
    upstream.headers.get("content-type") || "text/html; charset=utf-8";
  const buf = Buffer.from(await upstream.arrayBuffer());

  const headers = new Headers();
  headers.set("Content-Type", respContentType);
  headers.set("X-Proxied-Url", finalUrl);
  headers.set("Access-Control-Allow-Origin", "*");

  const lower = respContentType.toLowerCase();
  if (lower.includes("text/html") || lower.includes("application/xhtml")) {
    const rewritten = rewriteHtml({
      body: buf,
      contentType: respContentType,
      baseUrl: finalUrl,
    });
    headers.set("Content-Type", "text/html; charset=utf-8");
    return new NextResponse(rewritten, { status: 200, headers });
  }

  const { body: outBody, contentType: outCt } = rewriteNonHtml(
    buf,
    respContentType,
    finalUrl
  );
  headers.set("Content-Type", outCt);
  return new NextResponse(outBody, { status: 200, headers });
}
