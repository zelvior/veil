/**
 * Proxy Engine — Core DOM transformation & network interception layer.
 *
 * This module is SERVER-ONLY (imports cheerio). It provides:
 *   • rewriteHtml  — cheerio-based HTML attribute rewriting + interceptor injection
 *   • rewriteCss   — CSS url()/@import rewriting (re-exported from proxy.ts)
 *   • rewriteJs    — light-touch JS string-literal URL rewriting
 *   • buildInterceptorScript — the client-side fetch/XHR/DOM polyfill
 *   • stripSecurityHeaders   — removes CSP/X-Frame-Options/COOP that break framing
 *   • buildUpstreamHeaders   — realistic browser headers for anti-bot evasion
 *   • getProxyOrigin         — derives our own public origin from the request
 *
 * Design notes:
 *   - We use a unified route: /api/proxy?url=<base64url>. Every rewritten
 *     URL (links, images, scripts, CSS, forms, iframes) points here.
 *   - We do NOT inject <base href="target"> because it breaks absolute-path
 *     proxy URLs: with <base href="https://target.com/">, an <img src="/api/proxy?url=...">
 *     resolves to https://target.com/api/proxy?url=... (goes to the TARGET, not us).
 *     Instead, we resolve all relative URLs server-side during rewriting and
 *     pass the target base to the client interceptor for dynamic URLs.
 *   - The interceptor overrides window.fetch, XMLHttpRequest.open, and uses a
 *     MutationObserver to catch dynamically inserted DOM nodes.
 */

import * as cheerio from "cheerio";
import {
  encodeUrl,
  proxiedUrl,
  resolveUrl,
  isProxiable,
  rewriteCss,
} from "./proxy";
import { getProfile } from "./browser-profiles";
import { stripTrackersFromHtml } from "./tracker-blocker";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface RewriteHtmlOptions {
  html: string;
  baseUrl: string;
  proxyOrigin: string;
  profileId?: string | null;
}

/* ------------------------------------------------------------------ */
/* Security header normalization                                       */
/* ------------------------------------------------------------------ */

/**
 * Headers that break proxy framing or cross-origin embedding.
 * These are stripped from every upstream response before we send it
 * to the client, so the proxied page renders correctly inside our iframe.
 */
const STRIP_RESPONSE_HEADERS = [
  "content-security-policy",
  "content-security-policy-report-only",
  "x-frame-options",
  "x-content-type-options",
  "cross-origin-opener-policy",
  "cross-origin-embedder-policy",
  "cross-origin-resource-policy",
  "permissions-policy",
  "strict-transport-security",
  "x-xss-protection",
  "x-dns-prefetch-control",
  "x-permitted-cross-domain-policies",
  "referrer-policy",
  "origin-agent-cluster",
];

/**
 * Build a clean set of response headers for the proxied content.
 *
 * CRITICAL: We ALWAYS strip Content-Encoding (Node fetch auto-decompresses
 * the body, so what we serve is always identity-encoded). This means we
 * must ALSO strip Content-Length when the upstream used compression,
 * because the Content-Length from the upstream reflects the COMPRESSED
 * size — not the decompressed size we're actually sending. A mismatch
 * here causes "ERR_CONNECTION_RESET" / "The connection was reset" in
 * the browser.
 *
 * For 206 Partial Content responses (Range requests), we KEEP the
 * Content-Range header so video seeking works, but still strip
 * Content-Length if the body was decompressed.
 */
export function normalizeResponseHeaders(
  upstreamHeaders: Headers,
  opts: { rewritten: boolean; keepRangeHeaders?: boolean }
): Headers {
  const out = new Headers();

  // Check if the upstream used compression. If so, the Content-Length
  // is wrong for our decompressed body and MUST be stripped.
  const hadCompression = (() => {
    const enc = upstreamHeaders.get("content-encoding");
    return !!enc && enc.toLowerCase() !== "identity";
  })();

  upstreamHeaders.forEach((value, key) => {
    const lower = key.toLowerCase();

    // Strip security headers that break framing.
    if (STRIP_RESPONSE_HEADERS.includes(lower)) return;

    // Node fetch auto-decompresses; the body we serve is always identity.
    if (lower === "content-encoding") return;

    // ALWAYS strip Content-Length if:
    // 1. The body was rewritten (HTML/CSS/JS — length changed), OR
    // 2. The upstream used compression (length reflects compressed size,
    //    but our body is decompressed — mismatch causes connection reset)
    if (lower === "content-length") {
      if (opts.rewritten || hadCompression) return;
      // For non-compressed, non-rewritten content, keep Content-Length
      // so the browser can show download progress.
    }

    // Don't forward Set-Cookie to the client — we manage cookies server-side.
    if (lower === "set-cookie") return;

    // Strip Transfer-Encoding — we control the transfer, not the upstream.
    if (lower === "transfer-encoding") return;

    out.set(key, value);
  });

  // Allow our own origin to embed the response and read it.
  out.set("Access-Control-Allow-Origin", "*");
  // Allow the iframe to run scripts and submit forms.
  out.delete("x-frame-options");

  return out;
}

/* ------------------------------------------------------------------ */
/* Upstream request headers (anti-bot evasion)                         */
/* ------------------------------------------------------------------ */

/**
 * Build realistic browser request headers for the upstream fetch.
 * These mimic a real browser's navigation/resource request to avoid
 * naive User-Agent-based blocking.
 */
export function buildUpstreamHeaders(
  targetUrl: string,
  profileId: string | null | undefined,
  cookieHeader: string,
  opts: { isDocument: boolean; referer?: string }
): Record<string, string> {
  const profile = getProfile(profileId);

  const headers: Record<string, string> = {
    "User-Agent": profile.userAgent,
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    // Sec-Ch-Ua headers — many CDNs use these for client hints.
    "Sec-Ch-Ua-Mobile": profile.mobile ? "?1" : "?0",
  };

  if (profile.secChUa) headers["Sec-Ch-Ua"] = profile.secChUa;
  if (profile.secChUaPlatform) headers["Sec-Ch-Ua-Platform"] = profile.secChUaPlatform;

  if (opts.isDocument) {
    // Navigation (HTML page) request headers
    headers["Accept"] =
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,application/signed-exchange;v=b3;q=0.7,*/*;q=0.8";
    headers["Upgrade-Insecure-Requests"] = "1";
    headers["Sec-Fetch-Dest"] = "document";
    headers["Sec-Fetch-Mode"] = "navigate";
    headers["Sec-Fetch-Site"] = opts.referer ? "same-origin" : "none";
    headers["Sec-Fetch-User"] = "?1";
  } else {
    // Sub-resource (CSS/JS/image/font/XHR) request headers
    headers["Accept"] = "*/*";
    headers["Sec-Fetch-Dest"] = "empty";
    headers["Sec-Fetch-Mode"] = "cors";
    headers["Sec-Fetch-Site"] = "same-origin";
  }

  if (opts.referer) headers["Referer"] = opts.referer;
  if (cookieHeader) headers["Cookie"] = cookieHeader;

  return headers;
}

/* ------------------------------------------------------------------ */
/* Proxy origin detection                                              */
/* ------------------------------------------------------------------ */

/**
 * Derive our own public origin from the incoming request headers.
 * Handles Vercel's x-forwarded-* headers and direct localhost access.
 */
export function getProxyOrigin(reqHeaders: Headers): string {
  const host =
    reqHeaders.get("x-forwarded-host") ||
    reqHeaders.get("host") ||
    "localhost:3000";
  const proto = reqHeaders.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

/* ------------------------------------------------------------------ */
/* HTML rewriting                                                      */
/* ------------------------------------------------------------------ */

/**
 * Map of tag → URL-bearing attributes that we need to rewrite.
 * Each attribute is classified as either a "document" URL (navigations —
 * uses the page-fetch path) or a "resource" URL (images, scripts, styles —
 * uses the resource path). In our unified route, both go to /api/proxy?url=,
 * but we tag them so the server knows whether to rewrite HTML or stream.
 */
const URL_ATTR_MAP: Array<{ selector: string; attrs: string[] }> = [
  { selector: "a[href], area[href]", attrs: ["href"] },
  { selector: "form[action]", attrs: ["action"] },
  { selector: "iframe[src]", attrs: ["src"] },
  { selector: "link[href]", attrs: ["href"] },
  { selector: "script[src]", attrs: ["src"] },
  { selector: "img", attrs: ["src", "data-src", "srcset"] },
  { selector: "source, video, audio, track", attrs: ["src", "srcset", "poster"] },
  { selector: "embed[src], object[data]", attrs: ["src", "data"] },
  { selector: "input[src], input[formaction], button[formaction]", attrs: ["src", "formaction"] },
  { selector: "image[href], use[href]", attrs: ["href"] },
];

/**
 * Rewrite all URLs in an HTML document so they route through /api/proxy?url=.
 * Also injects the client-side interceptor script into <head> and strips
 * integrity/nonce/CSP-meta that would break rewritten resources.
 */
export function rewriteHtml(opts: RewriteHtmlOptions): string {
  const { html, baseUrl, proxyOrigin, profileId } = opts;
  const $ = cheerio.load(html, { decodeEntities: false });

  // Remove any existing <base> tag — we resolve all URLs server-side.
  // (See design notes at top of file for why we don't inject our own <base>.)
  $("base").remove();

  /**
   * Rewrite a single URL attribute value to a proxy URL.
   * - Hash-only links ("#section") are left as-is (same-page scroll).
   * - Already-proxied URLs are left as-is (avoid double-encoding).
   * - Relative URLs are resolved against `baseUrl` first.
   */
  const rewriteDocAttr = (val: string): string => {
    if (!val || !isProxiable(val) || val.startsWith("#")) return val;
    const resolved = resolveUrl(val, baseUrl);
    // Check if already a proxy URL to avoid double-encoding.
    if (resolved.startsWith(`${proxyOrigin}/api/proxy?url=`) || resolved.startsWith("/api/proxy?url=")) {
      return resolved;
    }
    return proxiedUrl(resolved, proxyOrigin);
  };

  const rewriteResAttr = (val: string): string => {
    if (!val || !isProxiable(val) || val.startsWith("#")) return val;
    const resolved = resolveUrl(val, baseUrl);
    if (resolved.startsWith(`${proxyOrigin}/api/proxy?url=`) || resolved.startsWith("/api/proxy?url=")) {
      return resolved;
    }
    return proxiedUrl(resolved, proxyOrigin);
  };

  /** Rewrite a srcset="url1 1x, url2 2x" attribute. */
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
        return `${proxiedUrl(resolved, proxyOrigin)} ${descriptor.join(" ")}`.trim();
      })
      .join(", ");
  };

  // Apply rewriting to every tag/attribute in our map.
  for (const { selector, attrs } of URL_ATTR_MAP) {
    $(selector).each((_, el) => {
      const node = $(el);
      for (const attr of attrs) {
        const val = node.attr(attr);
        if (!val) continue;
        if (attr === "srcset") {
          node.attr(attr, rewriteSrcset(val));
        } else {
          // All attributes use the same proxy route now (unified).
          node.attr(attr, rewriteDocAttr(val));
        }
      }
    });
  }

  // Rewrite inline <style> blocks and style="" attributes (CSS url()/@import).
  $("style").each((_, el) => {
    const node = $(el);
    const txt = node.html();
    if (txt) node.html(rewriteCss(txt, baseUrl, proxyOrigin));
  });
  $("[style]").each((_, el) => {
    const node = $(el);
    const style = node.attr("style");
    if (style) node.attr("style", rewriteCss(style, baseUrl, proxyOrigin));
  });

  // Remove integrity/nonce attributes — they'd fail validation since we
  // rewrote the resource URLs.
  $("[integrity]").removeAttr("integrity");
  $("[nonce]").removeAttr("nonce");

  // Strip CSP meta tags that would block our injected interceptor script.
  $('meta[http-equiv="Content-Security-Policy"]').remove();
  $('meta[http-equiv="Content-Security-Policy-Report-Only"]').remove();
  $('meta[http-equiv="X-Frame-Options"]').remove();

  // Strip tracker/ad scripts and inline analytics snippets from the HTML.
  // This is done AFTER URL rewriting so we can decode proxy URLs to check
  // the original target domain against the tracker blocklist.
  stripTrackersFromHtml($);

  // Inject the interceptor script as the FIRST element in <head>, so it
  // runs before any page scripts that might call fetch/XHR.
  const interceptor = buildInterceptorScript(baseUrl, proxyOrigin, profileId);
  const head = $("head");
  if (head.length) {
    head.prepend(interceptor);
  } else {
    // No <head> — prepend to <html> or the document root.
    $("html").prepend(interceptor);
  }

  return $.html();
}

/* ------------------------------------------------------------------ */
/* JS rewriting (light-touch)                                          */
/* ------------------------------------------------------------------ */

/**
 * Rewrite absolute https:// URLs inside JS string literals so they route
 * through the proxy. This catches simple cases like:
 *   fetch("https://api.example.com/data")
 *   var url = 'https://cdn.example.com/script.js'
 *
 * This is intentionally conservative — we only touch string-literal URLs,
 * not template literals or dynamic concatenation (which the client-side
 * interceptor handles at runtime).
 */
export function rewriteJs(js: string, baseUrl: string, proxyOrigin: string): string {
  if (!js) return js;
  return js.replace(
    /(["'`])(https?:\/\/[^"'`\s)]+)\1/g,
    (_match, quote: string, url: string) => {
      if (!isProxiable(url)) return _match;
      const resolved = resolveUrl(url, baseUrl);
      return `${quote}${proxiedUrl(resolved, proxyOrigin)}${quote}`;
    }
  );
}

/* ------------------------------------------------------------------ */
/* Client-side interceptor script                                      */
/* ------------------------------------------------------------------ */

/**
 * Build the JavaScript interceptor that gets injected into <head>.
 *
 * This script:
 *   1. Reports the real target URL + page title to the parent window
 *      (via postMessage) so the browser shell can update the address bar.
 *   2. Overrides window.fetch so dynamic API calls route through the proxy.
 *   3. Overrides XMLHttpRequest.prototype.open for the same.
 *   4. Uses a MutationObserver to catch dynamically inserted <script>,
 *      <img>, <iframe>, <link> etc. and rewrite their src/href attributes.
 *   5. Intercepts target=_blank / window.open to open new tabs in the shell.
 */
export function buildInterceptorScript(
  targetUrl: string,
  proxyOrigin: string,
  profileId?: string | null
): string {
  // Safely escape the target URL for embedding in a JS string literal.
  const safeUrl = targetUrl
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/<\/script>/gi, "<\\/script>");

  // The profile ID is forwarded so sub-resources use the same UA.
  const uaSuffix = profileId ? `&ua=${encodeURIComponent(profileId)}` : "";

  return `<script>(function(){
'use strict';
var TARGET_URL = '${safeUrl}';
var PROXY_ORIGIN = location.origin;
var PROXY_ROUTE = PROXY_ORIGIN + '/api/proxy?url=';
var UA_SUFFIX = '${uaSuffix}';

/* base64url encode a string */
function b64u(str){
  try { return btoa(str).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,''); }
  catch(e){ return ''; }
}
/* base64url decode */
function unb64u(str){
  try {
    var s = str.replace(/-/g,'+').replace(/_/g,'/');
    while(s.length % 4) s += '=';
    return atob(s);
  } catch(e){ return str; }
}

/* Check if a URL is already a proxy URL (avoid double-encoding). */
function isProxied(url){
  return url && (url.indexOf(PROXY_ROUTE) === 0 || url.indexOf('/api/proxy?url=') === 0);
}

/* Convert any URL (relative or absolute) to a proxy URL. */
function toProxy(url){
  if (!url) return url;
  var s = String(url);
  // Skip non-navigable schemes
  if (/^(javascript:|data:|blob:|mailto:|tel:|about:|#)/i.test(s)) return s;
  if (isProxied(s)) return s;
  try {
    var resolved = new URL(s, TARGET_URL).href;
    return PROXY_ROUTE + b64u(resolved) + UA_SUFFIX;
  } catch(e){ return s; }
}

/* Extract the original target URL from a proxy URL. */
function fromProxy(url){
  try {
    var u = new URL(url, PROXY_ORIGIN);
    var enc = u.searchParams.get('url');
    if (enc) return unb64u(enc);
  } catch(e){}
  return url;
}

/* ---- 1. postMessage sync to parent shell ---- */
function sendNav(){
  try { parent.postMessage({ __proxy:true, type:'navigate', url: TARGET_URL, title: document.title }, '*'); } catch(e){}
}
var origPush = history.pushState;
var origReplace = history.replaceState;
history.pushState = function(){ origPush.apply(this, arguments); sendNav(); };
history.replaceState = function(){ origReplace.apply(this, arguments); sendNav(); };
window.addEventListener('popstate', sendNav);
window.addEventListener('load', sendNav);
setTimeout(sendNav, 300);
setTimeout(sendNav, 2000);

/* ---- 1b. Intercept location.href / assign / replace ----
 * When site JS sets location.href = "/path" or calls location.assign("/path"),
 * the browser would navigate to "/path" relative to our proxy URL (losing
 * the ?url= param). We intercept these and redirect through toProxy().
 */
function interceptLocation(){
  try {
    var origAssign = location.assign.bind(location);
    var origReplace2 = location.replace.bind(location);
    location.assign = function(url){ origAssign(toProxy(url)); };
    location.replace = function(url){ origReplace2(toProxy(url)); };
    // Override the href setter on Location.prototype.
    var hrefDesc = Object.getOwnPropertyDescriptor(window.Location.prototype, 'href');
    if (hrefDesc && hrefDesc.set) {
      var origHrefSet = hrefDesc.set;
      Object.defineProperty(window.Location.prototype, 'href', {
        get: hrefDesc.get,
        set: function(v){ origHrefSet.call(this, toProxy(v)); },
        configurable: true,
        enumerable: true
      });
    }
  } catch(e){ /* some browsers lock Location.prototype */ }
}
interceptLocation();

/* ---- 1c. Intercept form submissions ----
 * SPA sites (like DuckDuckGo) sometimes submit GET forms via JS, which
 * can bypass the rewritten action URL. We intercept all form submit events
 * and ensure the form's action is a proxy URL before the browser navigates.
 */
document.addEventListener('submit', function(e){
  var form = e.target;
  if (!form || !form.tagName || form.tagName !== 'FORM') return;
  // Ensure the action is a proxy URL.
  var action = form.getAttribute('action');
  if (action && action.indexOf('/api/proxy?url=') === -1 && action.indexOf(PROXY_ROUTE) === -1) {
    try {
      var resolved = new URL(action, TARGET_URL).href;
      form.setAttribute('action', toProxy(resolved));
    } catch(err){}
  }
  // Also ensure method=GET forms preserve the url param by converting to
  // a hidden field, so the browser doesn't lose it when appending form data.
  if ((form.method || 'get').toLowerCase() === 'get') {
    var existingUrl = form.querySelector('input[name="__proxy_url"]');
    if (!existingUrl) {
      // Extract the encoded URL from the action and add it as a hidden field.
      var actionUrl = form.getAttribute('action') || '';
      var match = actionUrl.match(/[?&]url=([^&]+)/);
      if (match) {
        var hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = 'url';
        hidden.value = decodeURIComponent(match[1]);
        form.appendChild(hidden);
        // Remove url= from the action so the browser doesn't duplicate it.
        form.setAttribute('action', actionUrl.replace(/[?&]url=[^&]+/, ''));
      }
    }
  }
}, true);

/* ---- 2. window.open → open in parent shell ---- */
window.open = function(u){
  if (u) { try { parent.postMessage({ __proxy:true, type:'open', url: u }, '*'); } catch(e){} }
  return null;
};

/* ---- 3. Intercept target=_blank clicks + link hover for status bar ---- */
document.addEventListener('click', function(e){
  var a = e.target && e.target.closest && e.target.closest('a');
  if (!a || !a.href) return;
  if (a.target === '_blank' || a.target === '_top' || a.target === '_parent') {
    e.preventDefault();
    var target = fromProxy(a.href);
    try { parent.postMessage({ __proxy:true, type:'open', url: target }, '*'); } catch(err){}
  }
}, true);

// Report hovered link URLs to the parent for the status bar.
document.addEventListener('mouseover', function(e){
  var a = e.target && e.target.closest && e.target.closest('a');
  if (a && a.href) {
    var target = fromProxy(a.href);
    try { parent.postMessage({ __veilHover:true, url: target }, '*'); } catch(err){}
  }
}, true);
document.addEventListener('mouseout', function(){
  try { parent.postMessage({ __veilHover:true, url: null }, '*'); } catch(e){}
}, true);

/* ---- 4. Override window.fetch ---- */
if (window.fetch) {
  var origFetch = window.fetch;
  window.fetch = function(input, init){
    try {
      if (typeof input === 'string') {
        input = toProxy(input);
      } else if (input && input instanceof Request) {
        input = new Request(toProxy(input.url), input);
      }
    } catch(e){}
    return origFetch.call(this, input, init);
  };
}

/* ---- 5. Override XMLHttpRequest.open ---- */
if (window.XMLHttpRequest) {
  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url){
    try { arguments[1] = toProxy(url); } catch(e){}
    return origOpen.apply(this, arguments);
  };
}

/* ---- 5b. Override WebSocket constructor ----
 * Route ws:// and wss:// connections through the proxy. Since our proxy
 * is HTTP-based, we can't truly proxy raw WebSocket frames, but we rewrite
 * the URL so it at least attempts to connect via our endpoint. Sites that
 * require WebSocket will gracefully degrade; the connection won't leak
 * the user's IP to the target's WS server.
 */
if (window.WebSocket) {
  var OrigWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols){
    try {
      var proxiedUrl = toProxy(url);
      // Convert ws:/wss: scheme in the proxy URL to http:/https: since
      // our proxy route is HTTP. The proxy server can upgrade if needed.
      proxiedUrl = proxiedUrl.replace(/^ws:/i, 'http:').replace(/^wss:/i, 'https:');
      return new OrigWebSocket(proxiedUrl, protocols);
    } catch(e){
      return new OrigWebSocket(url, protocols);
    }
  };
  window.WebSocket.prototype = OrigWebSocket.prototype;
  window.WebSocket.CONNECTING = OrigWebSocket.CONNECTING;
  window.WebSocket.OPEN = OrigWebSocket.OPEN;
  window.WebSocket.CLOSING = OrigWebSocket.CLOSING;
  window.WebSocket.CLOSED = OrigWebSocket.CLOSED;
}

/* ---- 5c. Override Worker / SharedWorker constructors ----
 * Route worker script URLs through the proxy so sites that spawn Web
 * Workers don't bypass our interceptor. The worker script itself will
 * be rewritten by the proxy (JS rewriting), though the worker's internal
 * fetch/XHR won't be intercepted (workers have their own global scope).
 */
if (window.Worker) {
  var OrigWorker = window.Worker;
  window.Worker = function(scriptURL, options){
    try {
      var proxied = toProxy(scriptURL);
      return new OrigWorker(proxied, options);
    } catch(e){
      return new OrigWorker(scriptURL, options);
    }
  };
  window.Worker.prototype = OrigWorker.prototype;
}
if (window.SharedWorker) {
  var OrigSharedWorker = window.SharedWorker;
  window.SharedWorker = function(scriptURL, options){
    try {
      return new OrigSharedWorker(toProxy(scriptURL), options);
    } catch(e){
      return new OrigSharedWorker(scriptURL, options);
    }
  };
  window.SharedWorker.prototype = OrigSharedWorker.prototype;
}

/* ---- 5d. WebRTC IP Leak Prevention ----
 * RTCPeerConnection can leak the user's real local and public IP addresses
 * via ICE candidate gathering, even through a proxy. We neutralize it by
 * returning a NO-OP STUB instead of throwing — throwing crashes complex
 * SPAs like YouTube that expect RTCPeerConnection to be constructable.
 *
 * The stub implements the standard RTCPeerConnection interface with
 * no-op methods and empty event targets, so site code that does
 * new RTCPeerConnection() won't crash, but no real connection is
 * ever made (so no IP leak).
 */
function NoOpRTCPeerConnection(){
  // Return an object with the expected RTCPeerConnection interface.
  var noop = function(){};
  var emptyEmitter = { addEventListener: noop, removeEventListener: noop, dispatchEvent: function(){return false;} };
  return {
    createOffer: function(){ return Promise.reject(new Error('WebRTC disabled')); },
    createAnswer: function(){ return Promise.reject(new Error('WebRTC disabled')); },
    setLocalDescription: function(){ return Promise.resolve(); },
    setRemoteDescription: function(){ return Promise.resolve(); },
    addIceCandidate: function(){ return Promise.resolve(); },
    close: noop,
    getStats: function(){ return Promise.resolve(new Map()); },
    getSenders: function(){ return []; },
    getReceivers: function(){ return []; },
    getTransceivers: function(){ return []; },
    addTrack: function(){ return {}; },
    removeTrack: noop,
    addTransceiver: function(){ return {}; },
    createDataChannel: function(){ return emptyEmitter; },
    getConfiguration: function(){ return {}; },
    setConfiguration: noop,
    restartIce: noop,
    // Event targets
    onicecandidate: null,
    onicegatheringstatechange: null,
    oniceconnectionstatechange: null,
    onconnectionstatechange: null,
    ontrack: null,
    ondatachannel: null,
    onnegotiationneeded: null,
    onsignalingstatechange: null,
    addEventListener: noop,
    removeEventListener: noop,
    dispatchEvent: function(){ return false; },
    // State
    localDescription: null,
    remoteDescription: null,
    signalingState: 'closed',
    iceConnectionState: 'closed',
    connectionState: 'closed',
    iceGatheringState: 'complete',
    currentLocalDescription: null,
    currentRemoteDescription: null,
    pendingLocalDescription: null,
    pendingRemoteDescription: null,
  };
}
// Preserve static properties that sites may check.
if (window.RTCPeerConnection) {
  NoOpRTCPeerConnection.generateCertificate = function(){ return Promise.reject(new Error('WebRTC disabled')); };
  window.RTCPeerConnection = NoOpRTCPeerConnection;
}
if (window.webkitRTCPeerConnection) {
  window.webkitRTCPeerConnection = NoOpRTCPeerConnection;
}
if (window.mozRTCPeerConnection) {
  window.mozRTCPeerConnection = NoOpRTCPeerConnection;
}

/* ---- 5e. Override HTMLFormElement.prototype.submit ----
 * Some sites call form.submit() directly in JS instead of dispatching
 * a submit event. We override it to ensure the form's action is a proxy
 * URL before the browser navigates.
 */
if (window.HTMLFormElement && HTMLFormElement.prototype.submit) {
  var origFormSubmit = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = function(){
    try {
      var action = this.getAttribute('action');
      if (action && action.indexOf('/api/proxy?url=') === -1 && action.indexOf(PROXY_ROUTE) === -1) {
        var resolved = new URL(action, TARGET_URL).href;
        this.setAttribute('action', toProxy(resolved));
      }
    } catch(e){}
    return origFormSubmit.apply(this, arguments);
  };
}

/* ---- 6. MutationObserver: rewrite dynamically inserted elements ---- */
var URL_ATTRS = {
  'A': ['href'], 'AREA': ['href'], 'FORM': ['action'],
  'IMG': ['src','data-src','srcset'], 'SCRIPT': ['src'],
  'LINK': ['href'], 'IFRAME': ['src'], 'EMBED': ['src'],
  'OBJECT': ['data'], 'SOURCE': ['src','srcset'],
  'VIDEO': ['src','poster'], 'AUDIO': ['src'],
  'INPUT': ['src','formaction'], 'BUTTON': ['formaction'],
  'TRACK': ['src'], 'IMAGE': ['href'], 'USE': ['href']
};

function rewriteSrcset(val){
  return val.split(',').map(function(part){
    var seg = part.trim();
    if (!seg) return seg;
    var parts = seg.split(/\\s+/);
    var url = parts[0];
    var desc = parts.slice(1).join(' ');
    var proxied = toProxy(url);
    return proxied + (desc ? ' ' + desc : '');
  }).join(', ');
}

function rewriteEl(el){
  if (!el || el.nodeType !== 1) return;
  var attrs = URL_ATTRS[el.tagName];
  if (!attrs) return;
  for (var i = 0; i < attrs.length; i++) {
    var attr = attrs[i];
    var val = el.getAttribute(attr);
    if (!val) continue;
    var newVal = (attr === 'srcset') ? rewriteSrcset(val) : toProxy(val);
    if (newVal !== val) el.setAttribute(attr, newVal);
  }
}

function processNode(node){
  if (!node) return;
  if (node.nodeType === 1) rewriteEl(node);
  if (node.querySelectorAll) {
    var children = node.querySelectorAll('*');
    for (var i = 0; i < children.length; i++) rewriteEl(children[i]);
  }
}

if (window.MutationObserver) {
  var observer = new MutationObserver(function(mutations){
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      if (m.type === 'childList') {
        for (var j = 0; j < m.addedNodes.length; j++) {
          processNode(m.addedNodes[j]);
        }
      } else if (m.type === 'attributes') {
        rewriteEl(m.target);
      }
    }
  });
  function startObserver(){
    if (!document.documentElement) return;
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src','href','action','data-src','srcset','poster','data']
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }
}
})();</script>`;
}
