import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Veil Privacy Policy — How Zelvior Labs handles your data, cookies, and browsing privacy.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="October 2024">
      <p>
        At <strong>Veil</strong> ("we", "us", "our"), operated by{" "}
        <strong>Zelvior Labs</strong>, your privacy is our foundational
        principle. This Privacy Policy explains how we handle data when you use
        our web proxy service at <strong>veil.app</strong> (the "Service").
      </p>

      <h2>1. Our Core Privacy Commitment</h2>
      <p>
        Veil is designed as a <strong>privacy-first</strong> proxy. Unlike
        traditional browsers, our architecture ensures:
      </p>
      <ul>
        <li><strong>Your real IP address is never exposed</strong> to the websites you visit through the proxy.</li>
        <li><strong>All requests are fetched server-side</strong> — destination sites see our server's IP, not yours.</li>
        <li><strong>We do not log your browsing history</strong> on our servers. History is stored locally in your browser only.</li>
        <li><strong>We strip 21+ client-identifying headers</strong> (X-Forwarded-For, X-Real-IP, Via, etc.) before forwarding any request.</li>
        <li><strong>WebRTC IP leaks are blocked</strong> — RTCPeerConnection is neutralized to prevent local IP discovery.</li>
      </ul>

      <h2>2. Information We Do NOT Collect</h2>
      <p>We explicitly do <strong>not</strong> collect or store:</p>
      <ul>
        <li>Your real IP address or geolocation</li>
        <li>Your browsing history (stored locally in your browser via <strong>IndexedDB</strong> — never on our servers)</li>
        <li>Your bookmarks or quick links (stored locally via IndexedDB)</li>
        <li>Your settings and preferences (stored locally via IndexedDB)</li>
        <li>The content of pages you visit</li>
        <li>Personal identification information</li>
        <li>Analytics or telemetry data (we block our own trackers too)</li>
      </ul>

      <h2>2a. Local Storage — IndexedDB</h2>
      <p>
        All user data — browsing history, bookmarks, quick links, and
        settings — is stored exclusively in your browser using{" "}
        <strong>IndexedDB</strong>, a client-side database that persists
        across sessions. This data <strong>never leaves your device</strong>{" "}
        and is <strong>never sent to our servers</strong>.
      </p>
      <ul>
        <li><strong>History:</strong> URLs, titles, favicons, and timestamps of pages you visit</li>
        <li><strong>Bookmarks:</strong> Saved page URLs and titles</li>
        <li><strong>Quick Links:</strong> Custom shortcuts on the new-tab page</li>
        <li><strong>Settings:</strong> Theme, accent color, font, density, proxy toggle, browser profile, search engine</li>
      </ul>
      <p>
        You can clear all local data at any time via{" "}
        <strong>Settings → Privacy → Clear</strong> or by clearing your
        browser's site data. Clearing your browser's IndexedDB for this site
        will permanently delete all history, bookmarks, and settings.
      </p>

      <h2>2b. Proxy Toggle</h2>
      <p>
        Veil includes a <strong>proxy on/off toggle</strong> in the navigation
        bar. When the proxy is <strong>ON</strong> (green shield), all
        requests are routed through our server-side proxy — your IP is hidden
        from target sites. When the proxy is <strong>OFF</strong> (gray
        shield), pages load directly from the target site — this is faster
        but your real IP is exposed. The toggle state is saved in IndexedDB
        and persists across sessions.
      </p>

      <h2>3. Ephemeral Session Data</h2>
      <p>
        When you use Veil, we create an <strong>ephemeral session</strong> for
        you, identified by a random 128-bit token stored in a{" "}
        <code>__veil_sid</code> HttpOnly cookie. This session:
      </p>
      <ul>
        <li>Stores proxy cookies <strong>temporarily in server memory</strong> (not on disk)</li>
        <li>Is <strong>isolated per user</strong> — your cookies are never visible to other users</li>
        <li>Automatically <strong>expires after 30 minutes</strong> of inactivity</li>
        <li>Can be manually cleared at any time via Settings → Privacy → "Clear Cookies"</li>
      </ul>

      <h2>4. Tracker & Ad Blocking</h2>
      <p>
        Veil includes a built-in tracker blocking engine that blocks{" "}
        <strong>40+ known ad and tracking domains</strong> (Google Analytics,
        DoubleClick, Facebook Pixel, Hotjar, etc.) at both the DOM and request
        level. This means:
      </p>
      <ul>
        <li>Tracker scripts are <strong>stripped from HTML</strong> before reaching your browser</li>
        <li>Requests to tracker domains are <strong>blocked at the proxy level</strong> (returned as 204 No Content)</li>
        <li>Inline analytics snippets (<code>gtag()</code>, <code>fbq()</code>, <code>dataLayer.push()</code>) are removed</li>
      </ul>

      <h2>5. Cookies We Use</h2>
      <p>
        Veil itself uses only <strong>one cookie</strong> on our own domain:
      </p>
      <table>
        <thead>
          <tr><th>Cookie</th><th>Purpose</th><th>Duration</th><th>Type</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>__veil_sid</code></td>
            <td>Session identification for cookie isolation</td>
            <td>30 min inactivity / 24 hours max</td>
            <td>HttpOnly, SameSite=Lax</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>We do not use third-party cookies, analytics cookies, or advertising cookies on our own domain.</strong>
      </p>

      <h2>6. Upstream Website Cookies</h2>
      <p>
        When you visit a website through the proxy, that website may set cookies
        (e.g., session tokens, preferences). These cookies are:
      </p>
      <ul>
        <li>Stored in our <strong>ephemeral in-memory session store</strong> (not in your browser)</li>
        <li>Forwarded <strong>only</strong> back to the same target domain</li>
        <li>Automatically <strong>deleted when your session expires</strong></li>
        <li><strong>Never shared</strong> across different target websites</li>
      </ul>

      <h2>7. Data Security</h2>
      <p>
        We implement industry-standard security measures:
      </p>
      <ul>
        <li><strong>TLS/SSL encryption</strong> for all connections between you and our server</li>
        <li><strong>Header sanitization</strong> — all security headers (CSP, X-Frame-Options, COOP) are stripped from upstream responses to enable proxy framing</li>
        <li><strong>No persistent server-side logging</strong> of user activity</li>
        <li><strong>Session isolation</strong> — each user's data is sandboxed</li>
      </ul>

      <h2>8. Children's Privacy</h2>
      <p>
        Veil is not directed at children under 13. We do not knowingly collect
        any information from children. If you believe a child has provided us
        with information, please contact us and we will promptly delete it.
      </p>

      <h2>9. Your Rights</h2>
      <p>Under GDPR, CCPA, and other privacy regulations, you have the right to:</p>
      <ul>
        <li><strong>Access</strong> — request a copy of any data we hold about you (we hold none)</li>
        <li><strong>Deletion</strong> — clear all local data via your browser or Settings</li>
        <li><strong>Opt-out</strong> — Veil is opt-in by design; simply stop using the service</li>
        <li><strong>Data portability</strong> — your bookmarks/history are in your local SQLite database</li>
      </ul>
      <p>
        To exercise any rights, contact us at{" "}
        <a href="mailto:zelvior@proton.me">zelvior@proton.me</a>.
      </p>

      <h2>10. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify
        users of any material changes by updating the "Last updated" date at the
        top of this page. We encourage you to review this policy periodically.
      </p>

      <h2>11. Contact Us</h2>
      <p>
        If you have any questions about this Privacy Policy, please contact us:
      </p>
      <ul>
        <li>Email: <a href="mailto:zelvior@proton.me">zelvior@proton.me</a></li>
        <li>Discord: <a href="https://discord.gg/UQfzQzymc" target="_blank" rel="noreferrer">Join our community</a></li>
        <li>GitHub: <a href="https://github.com/zelvior/veil" target="_blank" rel="noreferrer">github.com/zelvior/veil</a></li>
      </ul>
    </LegalLayout>
  );
}
