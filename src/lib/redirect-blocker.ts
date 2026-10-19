/**
 * Auto-Redirect Blocking Engine
 *
 * Detects and blocks automatic redirects that websites perform without
 * user consent:
 *   - <meta http-equiv="refresh" content="0;url=...">
 *   - window.location.href = "..."
 *   - window.location.assign/replace(...)
 *   - window.open(...) with redirect
 *   - JavaScript setTimeout/setInterval redirects
 *   - <a> with onclick that navigates
 *
 * When a redirect is detected, instead of navigating, Veil shows a
 * permission prompt asking the user whether to allow the redirect.
 * The user can:
 *   - Allow once
 *   - Allow always for this domain
 *   - Block
 *
 * The "allow always" list is stored in IndexedDB.
 */

export interface RedirectRequest {
  /** The URL the page is trying to redirect to. */
  url: string;
  /** The source URL (the page that initiated the redirect). */
  sourceUrl: string;
  /** The method used to trigger the redirect. */
  method: "meta-refresh" | "location-href" | "location-assign" | "location-replace" | "window-open" | "timer";
  /** Timestamp of the redirect attempt. */
  timestamp: number;
}

export interface RedirectPermission {
  /** The domain that is allowed to redirect. */
  domain: string;
  /** The target domain it's allowed to redirect to (or "*" for any). */
  targetDomain: string;
  /** When the permission was granted. */
  grantedAt: number;
}

/**
 * In-memory store of redirect permissions.
 * In production, this is synced with IndexedDB via the settings store.
 */
const permissions = new Set<string>();

/** Check if a domain has permission to auto-redirect. */
export function hasRedirectPermission(sourceDomain: string, targetDomain?: string): boolean {
  // Check for exact match: "sourceDomain->targetDomain"
  if (targetDomain && permissions.has(`${sourceDomain}->${targetDomain}`)) {
    return true;
  }
  // Check for wildcard: "sourceDomain->*"
  if (permissions.has(`${sourceDomain}->*`)) {
    return true;
  }
  return false;
}

/** Grant redirect permission for a source domain. */
export function grantRedirectPermission(sourceDomain: string, targetDomain: string = "*"): void {
  permissions.add(`${sourceDomain}->${targetDomain}`);
}

/** Revoke redirect permission for a source domain. */
export function revokeRedirectPermission(sourceDomain: string, targetDomain?: string): void {
  if (targetDomain) {
    permissions.delete(`${sourceDomain}->${targetDomain}`);
  } else {
    // Remove all permissions for this source domain
    for (const perm of permissions) {
      if (perm.startsWith(`${sourceDomain}->`)) {
        permissions.delete(perm);
      }
    }
  }
}

/** Get all redirect permissions. */
export function getAllRedirectPermissions(): RedirectPermission[] {
  return Array.from(permissions).map((key) => {
    const [domain, targetDomain] = key.split("->");
    return {
      domain,
      targetDomain,
      grantedAt: Date.now(),
    };
  });
}

/** Clear all redirect permissions. */
export function clearAllRedirectPermissions(): void {
  permissions.clear();
}

/**
 * Check if a redirect should be blocked.
 * Returns true if the redirect should be blocked (no permission).
 */
export function shouldBlockRedirect(sourceUrl: string, targetUrl: string): boolean {
  try {
    const sourceDomain = new URL(sourceUrl).hostname;
    const targetDomain = new URL(targetUrl).hostname;
    return !hasRedirectPermission(sourceDomain, targetDomain);
  } catch {
    return false;
  }
}

/**
 * Detect common redirect patterns in an HTML string (before it's sent
 * to the browser). This is a server-side check that removes or neutralizes
 * automatic redirect mechanisms.
 *
 * Returns the modified HTML with redirects neutralized.
 */
export function neutralizeRedirects(html: string, baseUrl: string): string {
  let result = html;

  // 1. Remove <meta http-equiv="refresh" content="0;url=...">
  //    Replace with a comment so the user can see what was blocked.
  result = result.replace(
    /<meta\s+http-equiv=["']refresh["']\s+content=["'](\d+);\s*url=([^"']+)["'][^>]*>/gi,
    (match, delay, url) => {
      const delayNum = parseInt(delay, 10);
      if (delayNum <= 3) {
        // Block fast auto-refreshes (<= 3 seconds)
        return `<!-- Veil: blocked auto-refresh redirect to ${url} -->`;
      }
      return match; // Allow slow refreshes
    }
  );

  // 2. Neutralize window.location = "..." in inline scripts
  //    This is a best-effort regex — it won't catch everything, but
  //    it handles the most common patterns.
  result = result.replace(
    /window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/gi,
    (match, url) => {
      // Replace with a postMessage that asks the parent for permission
      return `__veilRedirect('location-href', ${JSON.stringify(url)})`;
    }
  );

  // 3. Neutralize location.assign(...) and location.replace(...)
  result = result.replace(
    /location\.(assign|replace)\s*\(\s*["']([^"']+)["']\s*\)/gi,
    (match, method, url) => {
      return `__veilRedirect('location-${method}', ${JSON.stringify(url)})`;
    }
  );

  return result;
}

/**
 * Build the client-side redirect interceptor script.
 * This is injected into the proxied page's <head>.
 */
export function buildRedirectInterceptor(targetUrl: string): string {
  const safeUrl = targetUrl
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/<\/script>/gi, "<\\/script>");

  return `<script>
(function(){
  var SOURCE_URL = '${safeUrl}';

  // Override location.href setter, assign, and replace
  function checkRedirect(method, url) {
    try {
      var msg = { __veilRedirect: true, method: method, url: url, source: SOURCE_URL };
      parent.postMessage(msg, '*');
      // Don't navigate — the parent will decide
      return false;
    } catch(e) {
      return true; // Allow if we can't communicate with parent
    }
  }

  // Expose the neutralized redirect function
  window.__veilRedirect = function(method, url) {
    checkRedirect(method, url);
  };

  // Override location.assign
  var origAssign = location.assign.bind(location);
  location.assign = function(url) {
    if (!checkRedirect('location-assign', url)) return;
    origAssign(url);
  };

  // Override location.replace
  var origReplace = location.replace.bind(location);
  location.replace = function(url) {
    if (!checkRedirect('location-replace', url)) return;
    origReplace(url);
  };

  // Override location.href setter
  try {
    var hrefDesc = Object.getOwnPropertyDescriptor(window.Location.prototype, 'href');
    if (hrefDesc && hrefDesc.set) {
      var origHrefSet = hrefDesc.set;
      Object.defineProperty(window.Location.prototype, 'href', {
        get: hrefDesc.get,
        set: function(v) {
          if (!checkRedirect('location-href', v)) return;
          origHrefSet.call(this, v);
        },
        configurable: true,
        enumerable: true
      });
    }
  } catch(e) {}

  // Override window.open
  var origOpen = window.open;
  window.open = function(url) {
    if (url && !checkRedirect('window-open', url)) return null;
    return origOpen.apply(this, arguments);
  };

  // Watch for setTimeout/setInterval redirects
  var origSetTimeout = window.setTimeout;
  window.setTimeout = function(fn, delay) {
    if (typeof fn === 'string' && /location\\.(href|assign|replace)/i.test(fn)) {
      // Extract the URL and check it
      var match = fn.match(/location\\.(?:href\\s*=\\s*)?["']([^"']+)["']/i);
      if (match && !checkRedirect('timer', match[1])) {
        return 0; // Don't set the timer
      }
    }
    return origSetTimeout.apply(this, arguments);
  };
})();
</script>`;
}
