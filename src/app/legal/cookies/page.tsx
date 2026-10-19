import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Veil Cookie Policy — How cookies work in the proxy, what we set, and how to manage them.",
};

export default function CookiesPage() {
  return (
    <LegalLayout title="Cookie Policy" lastUpdated="October 2024">
      <p>
        This Cookie Policy explains how <strong>Veil</strong>, operated by{" "}
        <strong>Zelvior Labs</strong>, uses cookies and similar technologies
        when you use our web proxy service.
      </p>

      <h2>1. What Are Cookies?</h2>
      <p>
        Cookies are small text files stored on your device when you visit a
        website. They are used to maintain state (like login sessions),
        preferences, and tracking identifiers.
      </p>

      <h2>2. Cookies Set by Veil (First-Party)</h2>
      <p>
        Veil sets <strong>only one cookie</strong> on our own domain:
      </p>
      <table>
        <thead>
          <tr><th>Cookie Name</th><th>Purpose</th><th>Duration</th><th>Attributes</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>__veil_sid</code></td>
            <td>Identifies your ephemeral proxy session. This allows us to isolate your proxy cookies from other users.</td>
            <td>30 minutes of inactivity (auto-expires). Max 24 hours.</td>
            <td><code>HttpOnly</code>, <code>SameSite=Lax</code>, <code>Secure</code> (in production)</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>That's it.</strong> We do not set analytics cookies,
        advertising cookies, or any other tracking cookies on our own domain.
      </p>

      <h2>3. How Upstream Website Cookies Work</h2>
      <p>
        When you visit a website through the proxy (e.g.,{" "}
        <code>example.com</code>), that website may attempt to set cookies.
        Here's how Veil handles them:
      </p>
      <ul>
        <li>
          <strong>Captured server-side</strong> — The website's{" "}
          <code>Set-Cookie</code> headers are captured by our proxy engine, not
          by your browser
        </li>
        <li>
          <strong>Stored in memory</strong> — Cookies are stored in our
          ephemeral session store (RAM), never written to disk
        </li>
        <li>
          <strong>Forwarded back to the same domain only</strong> — A cookie set
          by <code>example.com</code> is only sent back to{" "}
          <code>example.com</code>, never to other sites
        </li>
        <li>
          <strong>Automatically expired</strong> — Session cookies expire after
          30 minutes of inactivity or when you clear them
        </li>
      </ul>

      <h2>4. Session Isolation</h2>
      <p>
        Each user's proxy cookies are <strong>fully isolated</strong>:
      </p>
      <ul>
        <li>Your session ID is a random 128-bit cryptographic token</li>
        <li>Your cookie jar is separate from every other user's</li>
        <li>Cookies from one target site are never sent to a different target site</li>
        <li>When your session expires, all your proxy cookies are permanently deleted</li>
      </ul>

      <h2>5. Managing Cookies</h2>
      <h3>Clearing Proxy Cookies</h3>
      <p>
        You can clear all proxy cookies at any time:
      </p>
      <ul>
        <li>Open <strong>Settings</strong> (gear icon in the top-right)</li>
        <li>Go to the <strong>Privacy</strong> tab</li>
        <li>Click <strong>"Clear"</strong> next to "Cookies &amp; sessions"</li>
      </ul>
      <p>
        This immediately deletes all stored proxy cookies and creates a fresh
        session.
      </p>

      <h3>Clearing the Session Cookie</h3>
      <p>
        To clear Veil's own <code>__veil_sid</code> cookie:
      </p>
      <ul>
        <li>Clear cookies for our domain in your browser settings</li>
        <li>Or use your browser's "Clear browsing data" feature</li>
      </ul>

      <h3>Incognito Mode</h3>
      <p>
        Veil's incognito tabs do <strong>not</strong> record browsing history or
        bookmarks. However, proxy cookies are still stored in the shared session
        for functionality. Use the "Clear Cookies" feature to fully reset.
      </p>

      <h3>Local Data (IndexedDB)</h3>
      <p>
        In addition to cookies, Veil stores your <strong>browsing history,
        bookmarks, quick links, and settings</strong> in your browser's{" "}
        <strong>IndexedDB</strong>. This is client-side storage — the data
        never leaves your device and is not accessible to our servers. To
        clear it:
      </p>
      <ul>
        <li>Use <strong>Settings → Privacy → Clear History</strong> to clear browsing history</li>
        <li>Use your browser's "Clear browsing data" → "Site data" to clear all IndexedDB</li>
        <li>Or open DevTools → Application → IndexedDB → "veil-browser" to inspect/clear</li>
      </ul>

      <h2>6. Tracker Cookies</h2>
      <p>
        Veil's tracker blocking engine prevents <strong>40+ known tracker
        domains</strong> from setting cookies in the first place:
      </p>
      <ul>
        <li>Google Analytics, DoubleClick, Google Tag Manager</li>
        <li>Facebook Pixel, Twitter Ads</li>
        <li>Hotjar, Mixpanel, Amplitude, FullStory, LogRocket</li>
        <li>Sentry, New Relic, Clarity, ScoreCardResearch</li>
        <li>Criteo, Taboola, Outbrain, PubMatic, Rubicon</li>
      </ul>
      <p>
        Requests to these domains are blocked at the proxy level (returned as
        204 No Content), so they never set cookies.
      </p>

      <h2>7. Third-Party Embeds</h2>
      <p>
        Some websites embed third-party content (YouTube videos, social media
        widgets, etc.). When these load through the proxy:
      </p>
      <ul>
        <li>Their cookies are handled the same way as any upstream cookie (isolated, ephemeral)</li>
        <li>Tracker domains are blocked</li>
        <li>We do not control which cookies the embedded third party attempts to set</li>
      </ul>

      <h2>8. Browser Cookie Settings</h2>
      <p>
        Since Veil's own <code>__veil_sid</code> cookie is{" "}
        <code>HttpOnly</code> and <code>SameSite=Lax</code>:
      </p>
      <ul>
        <li>It cannot be read by JavaScript on the page</li>
        <li>It is only sent on same-site requests</li>
        <li>You can still block it via your browser's cookie settings if desired</li>
      </ul>

      <h2>9. Changes to This Policy</h2>
      <p>
        We may update this Cookie Policy as our service evolves. Any changes
        will be reflected in the "Last updated" date above.
      </p>

      <h2>10. Contact</h2>
      <p>Questions about cookies? Contact us:</p>
      <ul>
        <li>Email: <a href="mailto:zelvior@proton.me">zelvior@proton.me</a></li>
        <li>Discord: <a href="https://discord.gg/UQfzQzymc" target="_blank" rel="noreferrer">Join our community</a></li>
      </ul>
    </LegalLayout>
  );
}
