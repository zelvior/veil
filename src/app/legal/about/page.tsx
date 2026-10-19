import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "About Veil",
  description: "Learn about Veil — a privacy-first web proxy browser built by Zelvior Labs using Next.js 16.",
};

export default function AboutPage() {
  return (
    <LegalLayout title="About Veil" lastUpdated="October 2024">
      <p>
        <strong>Veil</strong> is a feature-rich, privacy-first web proxy
        browser that lets you unblock websites and browse anonymously. Built
        with <strong>Next.js 16</strong>, it combines a high-performance proxy
        engine with a full browser-grade UI.
      </p>

      <h2>Our Mission</h2>
      <p>
        At <strong>Zelvior Labs</strong>, we believe internet privacy is a
        fundamental right. Veil was created to provide a free, open-source tool
        that empowers users to:
      </p>
      <ul>
        <li>Access information without geographic or institutional restrictions</li>
        <li>Browse the web without exposing their real IP address</li>
        <li>Block invasive trackers, ads, and telemetry</li>
        <li>Prevent WebRTC IP leaks that compromise anonymity</li>
      </ul>

      <h2>How Veil Works</h2>
      <p>
        Veil uses a <strong>server-side proxy engine</strong> that:
      </p>
      <ol>
        <li>Fetches web content from the target website using our server's IP</li>
        <li>Rewrites all HTML, CSS, and JavaScript URLs to route through the proxy</li>
        <li>Strips security headers (CSP, X-Frame-Options) that would block proxy rendering</li>
        <li>Removes tracker scripts and inline analytics code</li>
        <li>Injects a client-side interceptor that patches fetch, XHR, WebSocket, and WebRTC</li>
        <li>Streams binary media (video, audio, images) with HTTP Range support</li>
        <li>Manages cookies in an ephemeral, per-session in-memory store</li>
      </ol>

      <h2>Key Features</h2>
      <ul>
        <li><strong>Multi-tab browsing</strong> with per-tab history and incognito mode</li>
        <li><strong>7 browser profiles</strong> — Chrome, Firefox, Safari, Edge (desktop &amp; mobile)</li>
        <li><strong>Ad &amp; tracker blocking</strong> — 200+ domains blocked + cosmetic CSS filters</li>
        <li><strong>Auto-redirect blocking</strong> — blocks unwanted redirects with permission prompts</li>
        <li><strong>Traffic mask</strong> — timing randomization, decoy requests, header shuffling</li>
        <li><strong>WebRTC IP leak prevention</strong> — RTCPeerConnection neutralized</li>
        <li><strong>Cookie session isolation</strong> — per-user ephemeral sessions</li>
        <li><strong>Streaming media</strong> — zero-buffer video/audio with Range seeking</li>
        <li><strong>Command palette</strong> (Ctrl+K) — fuzzy search across actions, history, bookmarks</li>
        <li><strong>Website unblocker</strong> — 34 popular sites across 6 categories</li>
        <li><strong>Light/Dark/System themes</strong> + <strong>8 accent colors</strong></li>
        <li><strong>Full appearance customization</strong> — themes, accent colors, fonts, density, UI toggles</li>
        <li><strong>Proxy on/off toggle</strong> — switch between proxied and direct browsing</li>
        <li><strong>IndexedDB storage</strong> — all data stored client-side, never on servers</li>
        <li><strong>PWA</strong> — installable, offline-capable, service worker</li>
        <li><strong>Fully responsive</strong> — mobile-first design</li>
      </ul>

      <h2>Auto-Redirect Blocking</h2>
      <p>
        Veil blocks automatic redirects that websites perform without user
        consent — including <code>&lt;meta http-equiv="refresh"&gt;</code>,
        <code>window.location.href</code>, <code>location.assign/replace</code>,
        and timer-based redirects. When a redirect is detected, Veil{" "}
        <strong>asks for permission</strong> before allowing it. You can:
      </p>
      <ul>
        <li><strong>Allow once</strong> — let this single redirect through</li>
        <li><strong>Allow always</strong> — trust this domain to redirect (saved in IndexedDB)</li>
        <li><strong>Block</strong> — prevent the redirect</li>
      </ul>
      <p>
        Toggle this feature in <strong>Settings → Privacy → Advanced Protection</strong>.
      </p>

      <h2>Ad &amp; Tracker Blocking (Maxed Out)</h2>
      <p>
        Veil&apos;s ad blocking is maxed out with a{" "}
        <strong>200+ domain blocklist</strong> covering:
      </p>
      <ul>
        <li><strong>Ad networks:</strong> DoubleClick, Google AdSense, AdNexus, Criteo, Taboola, Outbrain, and 50+ more</li>
        <li><strong>Trackers:</strong> Google Analytics, Facebook Pixel, Hotjar, Mixpanel, Amplitude, and 30+ more</li>
        <li><strong>Telemetry:</strong> Reddit events, SoundCloud telemetry, TikTok analytics, Adobe telemetry</li>
        <li><strong>Fingerprinting:</strong> FingerprintJS, Iovation, Sift, ThreatMetRIX, reCAPTCHA</li>
        <li><strong>Crypto mining:</strong> CoinHive, CryptoLoot, WebMine, and 20+ more</li>
        <li><strong>Malware:</strong> TrafficJunky, ExoClick, JuicyAds, and other malicious ad networks</li>
      </ul>
      <p>
        In addition to network-level blocking, Veil applies{" "}
        <strong>cosmetic CSS filters</strong> that hide ad elements served from
        the same domain (ad containers, sponsored content, cookie banners,
        paywall overlays, and newsletter popups).
      </p>

      <h2>Traffic Mask</h2>
      <p>
        The traffic mask feature adds noise to your browsing traffic to
        prevent traffic analysis:
      </p>
      <ul>
        <li><strong>Request timing randomization</strong> — 0-200ms random delays between sub-resource requests</li>
        <li><strong>Decoy requests</strong> — Periodically fetches common resources (favicon.ico, robots.txt) to add noise</li>
        <li><strong>Header shuffling</strong> — Randomizes non-critical header order and adds padding headers</li>
        <li><strong>WebSocket timing</strong> — Randomizes WebSocket connection timing</li>
      </ul>
      <p>
        Toggle in <strong>Settings → Privacy → Advanced Protection</strong>.
        Note: traffic mask may slightly slow down page loads.
      </p>

      <h2>Appearance Customization</h2>
      <p>
        Veil lets you fully customize the browser's appearance via{" "}
        <strong>Settings → Appearance</strong>:
      </p>
      <ul>
        <li><strong>Theme:</strong> Light, Dark, or System (follows your OS preference)</li>
        <li><strong>Accent color:</strong> 8 colors (Emerald, Blue, Violet, Rose, Amber, Cyan, Orange, Pink)</li>
        <li><strong>Font:</strong> System UI, Inter, Geist Sans, Geist Mono, or Serif</li>
        <li><strong>Density:</strong> Compact, Comfortable, or Spacious (controls padding/spacing)</li>
        <li><strong>UI toggles:</strong> Show/hide status bar, show/hide favicons in tabs</li>
      </ul>
      <p>
        All appearance settings are stored in IndexedDB and persist across
        sessions. The accent color is applied via CSS custom properties, so
        the entire UI (buttons, links, highlights, badges) updates instantly.
      </p>

      <h2>Proxy Toggle</h2>
      <p>
        A shield icon in the navigation bar lets you{" "}
        <strong>toggle the proxy on or off</strong> at any time:
      </p>
      <ul>
        <li><strong>ON (green shield):</strong> All requests route through the proxy server — your IP is hidden, trackers are blocked, WebRTC is neutralized</li>
        <li><strong>OFF (gray shield):</strong> Pages load directly from the target site — faster, but no privacy protection</li>
      </ul>
      <p>
        This is useful when the proxy is slow, when a site blocks proxy
        traffic, or when you need to test direct access. The toggle state
        is saved in IndexedDB.
      </p>

      <h2>Tech Stack</h2>
      <table>
        <thead>
          <tr><th>Component</th><th>Technology</th></tr>
        </thead>
        <tbody>
          <tr><td>Framework</td><td>Next.js 16 (App Router)</td></tr>
          <tr><td>Language</td><td>TypeScript 5</td></tr>
          <tr><td>Styling</td><td>Tailwind CSS 4 + shadcn/ui</td></tr>
          <tr><td>Database</td><td>Prisma ORM (SQLite)</td></tr>
          <tr><td>HTML Parsing</td><td>Cheerio</td></tr>
          <tr><td>State Management</td><td>Zustand</td></tr>
          <tr><td>Icons</td><td>Lucide React</td></tr>
          <tr><td>License</td><td>Apache 2.0</td></tr>
        </tbody>
      </table>

      <h2>Open Source</h2>
      <p>
        Veil is <strong>open-source</strong> and licensed under the{" "}
        <strong>Apache License 2.0</strong>. You can:
      </p>
      <ul>
        <li>View the source code on <a href="https://github.com/zelvior/veil" target="_blank" rel="noreferrer">GitHub</a></li>
        <li>Self-host your own instance</li>
        <li>Contribute features or bug fixes via Pull Requests</li>
        <li>Report issues on <a href="https://github.com/zelvior/veil/issues" target="_blank" rel="noreferrer">GitHub Issues</a></li>
      </ul>

      <h2>The Creator</h2>
      <p>
        Veil was created by{" "}
        <a href="https://linktr.ee/zelvior" target="_blank" rel="noreferrer">
          <strong>Zelvior</strong>
        </a>, a developer focused on privacy-enhancing technologies and web
        security research.
      </p>
      <ul>
        <li>GitHub: <a href="https://github.com/zelvior" target="_blank" rel="noreferrer">github.com/zelvior</a></li>
        <li>ORCID: <a href="https://orcid.org/0009-0009-2376-367X" target="_blank" rel="noreferrer">0009-0009-2376-367X</a></li>
        <li>NPM: <a href="https://www.npmjs.com/~zelnpm" target="_blank" rel="noreferrer">~zelnpm</a></li>
        <li>YouTube: <a href="https://youtube.com/@zelviorhere" target="_blank" rel="noreferrer">@zelviorhere</a></li>
        <li>Linktree: <a href="https://linktr.ee/zelvior" target="_blank" rel="noreferrer">linktr.ee/zelvior</a></li>
        <li>Email: <a href="mailto:zelvior@proton.me">zelvior@proton.me</a></li>
      </ul>

      <h2>Community</h2>
      <p>
        Join our growing community:
      </p>
      <ul>
        <li><a href="https://discord.gg/UQfzQzymc" target="_blank" rel="noreferrer">Discord server</a> — Chat, support, and updates</li>
        <li><a href="https://github.com/zelvior/veil" target="_blank" rel="noreferrer">GitHub repository</a> — Code and issues</li>
        <li><a href="https://youtube.com/@zelviorhere" target="_blank" rel="noreferrer">YouTube channel</a> — Tutorials and demos</li>
      </ul>

      <h2>Support the Project</h2>
      <p>
        Veil is a free, open-source project. You can support us by:
      </p>
      <ul>
        <li>⭐ Starring the <a href="https://github.com/zelvior/veil" target="_blank" rel="noreferrer">GitHub repository</a></li>
        <li>🐛 Reporting bugs on <a href="https://github.com/zelvior/veil/issues" target="_blank" rel="noreferrer">GitHub Issues</a></li>
        <li>💬 Joining our <a href="https://discord.gg/UQfzQzymc" target="_blank" rel="noreferrer">Discord community</a></li>
        <li>▶️ Subscribing on <a href="https://youtube.com/@zelviorhere" target="_blank" rel="noreferrer">YouTube</a></li>
        <li>🔗 Following on <a href="https://linktr.ee/zelvior" target="_blank" rel="noreferrer">Linktree</a></li>
      </ul>

      <h2>Acknowledgments</h2>
      <p>
        Veil stands on the shoulders of giants. We thank the teams behind:
      </p>
      <ul>
        <li><a href="https://nextjs.org" target="_blank" rel="noreferrer">Next.js</a> — The React framework</li>
        <li><a href="https://ui.shadcn.com" target="_blank" rel="noreferrer">shadcn/ui</a> — Beautiful components</li>
        <li><a href="https://cheerio.js.org" target="_blank" rel="noreferrer">Cheerio</a> — HTML parsing</li>
        <li><a href="https://www.prisma.io" target="_blank" rel="noreferrer">Prisma</a> — Database ORM</li>
        <li><a href="https://lucide.dev" target="_blank" rel="noreferrer">Lucide</a> — Icon toolkit</li>
      </ul>
    </LegalLayout>
  );
}
