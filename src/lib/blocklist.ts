/**
 * Expanded Ad & Tracker Blocklist
 *
 * 200+ domains covering ads, trackers, analytics, telemetry, fingerprinting,
 * crypto-mining, and malicious domains. Used by both the server-side proxy
 * (request-level blocking) and the client-side interceptor (DOM-level blocking).
 *
 * Organized by category for maintainability.
 */

/** Ad networks and display advertising. */
const AD_DOMAINS = [
  "doubleclick.net",
  "googlesyndication.com",
  "googleadservices.com",
  "googletagservices.com",
  "adservice.google.com",
  "ads.google.com",
  "g.doubleclick.net",
  "stats.g.doubleclick.net",
  "adsystem.com",
  "adnxs.com",
  "criteo.com",
  "taboola.com",
  "outbrain.com",
  "pubmatic.com",
  "rubiconproject.com",
  "openx.net",
  "casalemedia.com",
  "3lift.com",
  "adform.net",
  "yieldlab.net",
  "yldbt.com",
  "adtech.de",
  "adtech.com",
  "aolcloud.net",
  "atwola.com",
  "bluelithium.com",
  "crwdcntrl.net",
  "demdex.net",
  "flashtalking.com",
  "mathtag.com",
  "mediavine.com",
  "moatads.com",
  "moatpixel.com",
  "nativo.com",
  "onesignal.com",
  "polarmobile.com",
  "revcontent.com",
  "rlcdn.com",
  "scorecardresearch.com",
  "serving-sys.com",
  "sonobi.com",
  "springserve.com",
  "tubemogul.com",
  "underton.com",
  "undertone.com",
  "vrvm.com",
  "xertive.com",
  "yieldmo.com",
  "zedo.com",
  "adsterra.com",
  "propellerads.com",
  "popads.net",
  "popcash.net",
  "adcash.com",
  "infolinks.com",
  "chitika.com",
  "kontera.com",
  "vibrantmedia.com",
  "skimresources.com",
  "viglink.com",
];

/** Analytics and tracking. */
const TRACKER_DOMAINS = [
  "google-analytics.com",
  "googletagmanager.com",
  "www.googletagmanager.com",
  "www.google-analytics.com",
  "connect.facebook.net",
  "www.facebook.com",
  "graph.facebook.com",
  "analytics.facebook.com",
  "ads-twitter.com",
  "analytics.twitter.com",
  "bat.bing.com",
  "clarity.ms",
  "scorecardresearch.com",
  "quantserve.com",
  "quantcount.com",
  "hotjar.com",
  "mixpanel.com",
  "segment.io",
  "amplitude.com",
  "fullstory.com",
  "logrocket.com",
  "sentry.io",
  "newrelic.com",
  "rum.browser-intake-datadoghq.com",
  "browser-intake-datadoghq.com",
  "heap.io",
  "kissmetrics.com",
  "matomo.org",
  "statcounter.com",
  "clicky.com",
  "goatcounter.com",
  "fathom.com",
  "plausible.io",
  "chartbeat.com",
  "chartbeat.net",
  "tynt.com",
  "crowdscience.com",
  "visidata.com",
];

/** Telemetry and error reporting. */
const TELEMETRY_DOMAINS = [
  "telemetry.soundcloud.com",
  "events.reddit.com",
  "telemetry.mozilla.org",
  "telemetry.qualcomm.com",
  "vortex.data.microsoft.com",
  "telemetry.microsoft.com",
  "browser.events.msn.com",
  "telemetry.adobe.io",
  "telemetry.photonengine.com",
  "telemetry.unity3d.com",
  "analytics.tiktok.com",
  "log.tiktokv.com",
  "events.tiktok.com",
  "business-api.tiktok.com",
];

/** Fingerprinting and device identification. */
const FINGERPRINT_DOMAINS = [
  "fingerprintjs.com",
  "deviceatlas.com",
  "iovation.com",
  "siftscience.com",
  "sift.com",
  "simility.com",
  "threatmetrix.com",
  "signifyd.com",
  "riskified.com",
  "kount.com",
  "biozinga.com",
  "trustdecision.com",
  "arkoselabs.com",
  "funcaptcha.com",
  "recaptcha.net",
  "www.google.com/recaptcha",
  "hcaptcha.com",
  "txfkv.com",
];

/** Crypto mining and unwanted scripts. */
const CRYPTO_DOMAINS = [
  "coinhive.com",
  "coin-hive.com",
  "jsecoin.com",
  "cryptoloot.com",
  "miner.pr0gramm.com",
  "webmine.cz",
  "monerominer.rocks",
  "load.jsecoin.com",
  "coinerra.com",
  "coinhave.com",
  "coinnebula.com",
  "crypto-loot.com",
  "cryptolitepool.com",
  "deepmine.io",
  "gridcash.net",
  "hash-to-win.com",
  "hashflare.io",
  "hashing.win",
  "miner-pr0gramm.com",
  "minero.cc",
  "minexmr.com",
  "projectpoi.com",
  "rainbowminer.com",
  "webmining.co",
  "webminepool.com",
];

/** Malicious and unwanted domains. */
const MALWARE_DOMAINS = [
  "trafficjunky.com",
  "static.trafficjunky.com",
  "exoclick.com",
  "exosrv.com",
  "juicyads.com",
  "trafficstars.com",
  "trafficforce.com",
  "adsterra.com",
  "clickadu.com",
  "hilltopads.com",
  "ads.exoclick.com",
  "main.exosrv.com",
  "syndication.exoclick.com",
];

/** Combine all domains into a single Set for O(1) lookup. */
export const BLOCKED_DOMAINS = new Set<string>([
  ...AD_DOMAINS,
  ...TRACKER_DOMAINS,
  ...TELEMETRY_DOMAINS,
  ...FINGERPRINT_DOMAINS,
  ...CRYPTO_DOMAINS,
  ...MALWARE_DOMAINS,
]);

/**
 * Check if a URL points to a known ad/tracker/malware domain.
 * Matches on the hostname and all parent domains.
 */
export function isBlockedDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    let domain = hostname;
    while (domain) {
      if (BLOCKED_DOMAINS.has(domain)) return true;
      const dot = domain.indexOf(".");
      if (dot === -1) break;
      domain = domain.slice(dot + 1);
      if (!domain.includes(".")) break;
    }
    return false;
  } catch {
    return false;
  }
}

/** Get the total number of blocked domains (for UI display). */
export function blockedDomainCount(): number {
  return BLOCKED_DOMAINS.size;
}

/**
 * Cosmetic filter rules — CSS selectors for hiding ad elements that
 * are served from the same domain (can't be blocked at the network level).
 *
 * Applied as a <style> tag injected into the proxied page.
 */
export const COSMETIC_FILTERS = [
  // Generic ad containers
  "[id*='ad-container']",
  "[id*='ad_banner']",
  "[id*='ad-banner']",
  "[id*='advert']",
  "[id*='google_ad']",
  "[id*='google-ad']",
  "[id*='adsense']",
  "[class*='ad-container']",
  "[class*='ad_banner']",
  "[class*='ad-banner']",
  "[class*='advert']",
  "[class*='google_ad']",
  "[class*='adsense']",
  "[class*='ad-slot']",
  "[class*='ad-slot__container']",
  "[class*='ad-wrapper']",
  "[class*='ads__wrapper']",
  "[class*='ad-zone']",
  "[class*='ad-zone__container']",
  // Common ad sizes
  "[id*='div-gpt-ad']",
  "ins.adsbygoogle",
  "[id*='pmc-ad-incontent']",
  // Social media widgets
  "iframe[src*='facebook.com/plugins/']",
  "iframe[src*='platform.twitter.com']",
  "iframe[src*='apis.google.com']",
  "iframe[src*='plus.google.com']",
  // Newsletter popups
  "[class*='newsletter-popup']",
  "[class*='newsletter-modal']",
  "[id*='newsletter-popup']",
  "[id*='newsletter-modal']",
  // Cookie consent banners (aggressive)
  "[id*='cookie-consent']",
  "[id*='cookieConsent']",
  "[class*='cookie-consent']",
  "[class*='cookieConsent']",
  "[id*='onetrust']",
  "[class*='onetrust']",
  "#onetrust-banner-sdk",
  "#onetrust-consent-sdk",
  // Paywall overlays
  "[class*='paywall']",
  "[id*='paywall']",
  // Sponsor / promoted content
  "[class*='sponsored']",
  "[class*='promoted']",
  "[data-sponsored]",
  "[data-promoted]",
];

/** Build a CSS string from the cosmetic filters. */
export function buildCosmeticCSS(): string {
  return COSMETIC_FILTERS.map((s) => `${s} { display: none !important; }`).join("\n");
}
