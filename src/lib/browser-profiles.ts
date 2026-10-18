/**
 * Browser profile / User-Agent definitions shared between the proxy
 * routes (server) and the store / UI (client).
 */

export interface BrowserProfile {
  id: string;
  label: string;
  userAgent: string;
  /** Sec-Ch-Ua header value, for Chromium-based profiles. */
  secChUa?: string;
  /** Sec-Ch-Ua-Platform header value. */
  secChUaPlatform?: string;
  /** Whether this is a mobile profile. */
  mobile: boolean;
  /** Short description shown in the UI. */
  description: string;
}

export const BROWSER_PROFILES: BrowserProfile[] = [
  {
    id: "chrome-win",
    label: "Chrome · Windows",
    description: "Chrome 124 on Windows 10",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    secChUa: '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    secChUaPlatform: '"Windows"',
    mobile: false,
  },
  {
    id: "chrome-mac",
    label: "Chrome · macOS",
    description: "Chrome 124 on macOS",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    secChUa: '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    secChUaPlatform: '"macOS"',
    mobile: false,
  },
  {
    id: "firefox-win",
    label: "Firefox · Windows",
    description: "Firefox 125 on Windows",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    secChUaPlatform: '"Windows"',
    mobile: false,
  },
  {
    id: "safari-mac",
    label: "Safari · macOS",
    description: "Safari 17.4 on macOS",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    secChUaPlatform: '"macOS"',
    mobile: false,
  },
  {
    id: "edge-win",
    label: "Edge · Windows",
    description: "Edge 124 on Windows",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
    secChUa: '"Chromium";v="124", "Microsoft Edge";v="124", "Not-A.Brand";v="99"',
    secChUaPlatform: '"Windows"',
    mobile: false,
  },
  {
    id: "chrome-android",
    label: "Chrome · Android",
    description: "Chrome 124 on Android (mobile)",
    userAgent:
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    secChUa: '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    secChUaPlatform: '"Android"',
    mobile: true,
  },
  {
    id: "safari-ios",
    label: "Safari · iPhone",
    description: "Safari 17.4 on iOS (mobile)",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    secChUaPlatform: '"iOS"',
    mobile: true,
  },
];

/** The default profile used when none is specified. */
export const DEFAULT_PROFILE_ID = "chrome-win";

/** Look up a profile by id (falls back to the default). */
export function getProfile(id: string | undefined | null): BrowserProfile {
  return BROWSER_PROFILES.find((p) => p.id === id) ?? BROWSER_PROFILES[0];
}

/**
 * Categories of commonly-blocked sites for the Unblocker UI.
 * Kept here so both the server and client can reference them.
 */
export interface UnblockSite {
  url: string;
  name: string;
  /** Optional note about compatibility. */
  note?: string;
}

export interface UnblockCategory {
  name: string;
  icon: string; // lucide icon name
  sites: UnblockSite[];
}

export const UNBLOCK_CATEGORIES: UnblockCategory[] = [
  {
    name: "Search",
    icon: "Search",
    sites: [
      { url: "https://www.google.com", name: "Google" },
      { url: "https://www.bing.com", name: "Bing" },
      { url: "https://duckduckgo.com", name: "DuckDuckGo" },
      { url: "https://search.brave.com", name: "Brave Search" },
      { url: "https://www.startpage.com", name: "Startpage" },
      { url: "https://www.ecosia.org", name: "Ecosia" },
    ],
  },
  {
    name: "Social",
    icon: "Users",
    sites: [
      { url: "https://www.reddit.com", name: "Reddit" },
      { url: "https://twitter.com", name: "Twitter / X" },
      { url: "https://www.instagram.com", name: "Instagram" },
      { url: "https://www.facebook.com", name: "Facebook" },
      { url: "https://discord.com", name: "Discord" },
      { url: "https://mastodon.social", name: "Mastodon" },
    ],
  },
  {
    name: "News",
    icon: "Newspaper",
    sites: [
      { url: "https://www.bbc.com/news", name: "BBC News" },
      { url: "https://www.theguardian.com", name: "The Guardian" },
      { url: "https://www.reuters.com", name: "Reuters" },
      { url: "https://apnews.com", name: "AP News" },
      { url: "https://www.aljazeera.com", name: "Al Jazeera" },
      { url: "https://www.npr.org", name: "NPR" },
    ],
  },
  {
    name: "Reference",
    icon: "BookOpen",
    sites: [
      { url: "https://en.wikipedia.org", name: "Wikipedia", note: "May block some proxies" },
      { url: "https://stackoverflow.com", name: "Stack Overflow" },
      { url: "https://github.com", name: "GitHub" },
      { url: "https://www.w3schools.com", name: "W3Schools" },
      { url: "https://developer.mozilla.org", name: "MDN Web Docs" },
      { url: "https://archive.org", name: "Internet Archive" },
    ],
  },
  {
    name: "Media",
    icon: "Play",
    sites: [
      { url: "https://www.youtube.com", name: "YouTube", note: "Limited — login/streaming may not work" },
      { url: "https://vimeo.com", name: "Vimeo" },
      { url: "https://soundcloud.com", name: "SoundCloud" },
      { url: "https://www.twitch.tv", name: "Twitch" },
      { url: "https://www.imdb.com", name: "IMDb" },
    ],
  },
  {
    name: "Tech",
    icon: "Cpu",
    sites: [
      { url: "https://news.ycombinator.com", name: "Hacker News" },
      { url: "https://www.producthunt.com", name: "Product Hunt" },
      { url: "https://techcrunch.com", name: "TechCrunch" },
      { url: "https://www.theverge.com", name: "The Verge" },
      { url: "https://arstechnica.com", name: "Ars Technica" },
    ],
  },
];
