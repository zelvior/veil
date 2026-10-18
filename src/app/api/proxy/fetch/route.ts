import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import {
  resolveUrl,
  isProxiable,
  proxiedFetchUrl,
  proxiedResourceUrl,
  rewriteCss,
} from "@/lib/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** Script injected into every proxied page to keep the parent in sync.
 *  __PROXY_URL__ is replaced with the real destination URL before injection. */
const BOOTSTRAP_TEMPLATE = `
<script>
(function(){
  var PROXY_URL = "__PROXY_URL__";
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
  setTimeout(send, 300);
})();
</script>`;

function buildBootstrap(realUrl: string): string {
  // Escape any quotes/backslashes in the URL for safe JS string embedding.
  const safe = realUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/<\/script>/gi, "<\\/script>");
  return BOOTSTRAP_TEMPLATE.replace("__PROXY_URL__", safe);
}

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
  // <form action>
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
  $("source[src], video[src], video[poster], audio[src], track[src], embed[src], object[data], input[src], input[formaction], button[formaction]")
    .each((_, el) => {
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

  // remove <base> (we resolve against real URL)
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

  // Remove integrity / nonce checks that would break our rewritten resources
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
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
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
    upstream.headers.get("content-type") || "text/html; charset=utf-8";
  const buf = Buffer.from(await upstream.arrayBuffer());

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
