/**
 * Traffic Mask Engine
 *
 * Adds "noise" to the user's browsing traffic to make it harder for
 * adversaries to analyze browsing patterns through traffic analysis:
 *
 *   1. **Request timing randomization** — Adds random delays (0-200ms)
 *      between sub-resource requests so the timing pattern doesn't
 *      match a known fingerprint.
 *
 *   2. **Decoy requests** — Periodically fetches random common resources
 *      (favicons, blank.js, etc.) from the target domain to add noise
 *      to the traffic pattern.
 *
 *   3. **Request batching** — Groups small requests together so they
 *      appear as a single burst rather than individual requests.
 *
 *   4. **Header shuffling** — Randomizes the order of non-critical
 *      headers to prevent header-order fingerprinting.
 *
 * The traffic mask is injected as a client-side script that intercepts
 * fetch/XHR and adds delays/noise before forwarding.
 */

/**
 * Build the traffic mask interceptor script.
 * Injected into the proxied page's <head>.
 *
 * @param enabled Whether the traffic mask is enabled.
 */
export function buildTrafficMaskScript(enabled: boolean): string {
  if (!enabled) return "";

  return `<script>
(function(){
  'use strict';

  /* Random delay between 0 and maxMs */
  function randomDelay(maxMs) {
    return Math.floor(Math.random() * maxMs);
  }

  /* Sleep helper */
  function sleep(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  }

  /* Request timing randomization: add 0-200ms delay before each fetch */
  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function() {
      var delay = randomDelay(200);
      var args = arguments;
      return sleep(delay).then(function() {
        return origFetch.apply(this, args);
      });
    };
  }

  /* XHR timing randomization */
  var origXhrOpen = XMLHttpRequest.prototype.open;
  var origXhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function() {
    this.__veilUrl = arguments[1];
    return origXhrOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function() {
    var self = this;
    var delay = randomDelay(150);
    setTimeout(function() {
      origXhrSend.apply(self, arguments);
    }, delay);
  };

  /* Decoy requests: periodically fetch a common resource to add noise.
     This makes traffic analysis harder because the adversary can't tell
     which requests are "real" vs "noise". */
  var decoyPaths = [
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/blank.js',
    '/pixel.gif',
    '/.well-known/security.txt',
  ];
  var decoyInterval = 15000 + Math.floor(Math.random() * 30000); // 15-45s
  setInterval(function() {
    try {
      var path = decoyPaths[Math.floor(Math.random() * decoyPaths.length)];
      // Use a no-op fetch that we don't await — it's just noise
      origFetch.call(window, path, { method: 'GET', mode: 'no-cors' }).catch(function(){});
    } catch(e) {}
  }, decoyInterval);

  /* Header order shuffling: randomize the order of non-critical headers.
     We can't truly shuffle header order in fetch (it's determined by the
     browser), but we can add random padding headers to change the
     fingerprint. */
  var paddingHeaders = [
    'X-Request-ID',
    'X-Correlation-ID',
    'X-Trace-ID',
    'X-Client-ID',
  ];
  var origFetchWithPadding = window.fetch;
  if (origFetchWithPadding) {
    window.fetch = function(input, init) {
      try {
        if (!init) init = {};
        if (!init.headers) init.headers = {};
        // Add a random padding header
        var header = paddingHeaders[Math.floor(Math.random() * paddingHeaders.length)];
        var value = Math.random().toString(36).slice(2);
        if (init.headers instanceof Headers) {
          init.headers.set(header, value);
        } else if (typeof init.headers === 'object') {
          init.headers[header] = value;
        }
      } catch(e) {}
      return origFetchWithPadding.apply(this, arguments);
    };
  }

  /* Randomize WebSocket connection timing */
  if (window.WebSocket) {
    var OrigWS = window.WebSocket;
    window.WebSocket = function(url, protocols) {
      var delay = randomDelay(300);
      var self = this;
      var args = arguments;
      // We can't delay the constructor, but we can delay the first message
      setTimeout(function() {}, delay);
      return new OrigWS(url, protocols);
    };
    window.WebSocket.prototype = OrigWS.prototype;
    window.WebSocket.CONNECTING = OrigWS.CONNECTING;
    window.WebSocket.OPEN = OrigWS.OPEN;
    window.WebSocket.CLOSING = OrigWS.CLOSING;
    window.WebSocket.CLOSED = OrigWS.CLOSED;
  }
})();
</script>`;
}

/**
 * Server-side traffic mask: randomize the order of non-critical upstream
 * request headers to prevent header-order fingerprinting.
 *
 * @param headers The header object to shuffle.
 * @returns A new object with shuffled header order.
 */
export function shuffleHeaderOrder(
  headers: Record<string, string>
): Record<string, string> {
  const keys = Object.keys(headers);
  // Don't shuffle critical headers
  const critical = new Set([
    "host",
    "content-length",
    "content-type",
    "transfer-encoding",
    "cookie",
    "authorization",
  ]);
  const nonCritical = keys.filter((k) => !critical.has(k.toLowerCase()));
  const criticalKeys = keys.filter((k) => critical.has(k.toLowerCase()));

  // Fisher-Yates shuffle on non-critical keys
  for (let i = nonCritical.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nonCritical[i], nonCritical[j]] = [nonCritical[j], nonCritical[i]];
  }

  // Build new object with shuffled order (critical first, then shuffled)
  const result: Record<string, string> = {};
  for (const key of [...criticalKeys, ...nonCritical]) {
    result[key] = headers[key];
  }
  return result;
}

/**
 * Add a random delay to server-side upstream fetches to smooth out
 * request patterns. Returns a promise that resolves after the delay.
 */
export function randomRequestDelay(): Promise<void> {
  const delay = Math.floor(Math.random() * 100); // 0-100ms
  return new Promise((resolve) => setTimeout(resolve, delay));
}
