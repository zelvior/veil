import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "Veil Disclaimer — Important limitations and warnings about using the Veil web proxy service.",
};

export default function DisclaimerPage() {
  return (
    <LegalLayout title="Disclaimer" lastUpdated="October 2024">
      <p>
        The information and service provided by <strong>Veil</strong>,
        operated by <strong>Zelvior Labs</strong>, is offered "as is" with the
        following disclaimers. By using the Service, you acknowledge and accept
        these limitations.
      </p>

      <h2>1. No Guarantee of Anonymity</h2>
      <p>
        While Veil is designed to protect your privacy by hiding your IP address
        from target websites, <strong>no proxy can guarantee 100% anonymity</strong>.
        Advanced fingerprinting techniques, traffic correlation attacks, and
        side-channel analysis may still identify users. Veil should not be used
        for:
      </p>
      <ul>
        <li>Whistleblowing where life or liberty is at risk</li>
        <li>Evading law enforcement surveillance</li>
        <li>Any activity where anonymity is critical</li>
      </ul>
      <p>
        For critical anonymity needs, consider <strong>Tor Browser</strong> or a
        trusted VPN in addition to or instead of Veil.
      </p>

      <h2>2. Not a VPN Replacement</h2>
      <p>
        Veil is a <strong>web proxy</strong>, not a VPN. Key differences:
      </p>
      <table>
        <thead>
          <tr><th>Feature</th><th>Veil (Proxy)</th><th>VPN</th></tr>
        </thead>
        <tbody>
          <tr><td>Network-layer encryption</td><td>No (HTTP/HTTPS only)</td><td>Yes (all traffic)</td></tr>
          <tr><td>App traffic</td><td>Browser only</td><td>All apps</td></tr>
          <tr><td>DNS leaks</td><td>Possible</td><td>Prevented</td></tr>
          <tr><td>IP hiding strength</td><td>Medium</td><td>High</td></tr>
        </tbody>
      </table>

      <h2>3. Website Compatibility</h2>
      <p>
        <strong>Not all websites will work through the proxy.</strong> Common
        issues include:
      </p>
      <ul>
        <li><strong>IP blocking</strong> — Many websites (Wikipedia, Cloudflare-protected sites) block known datacenter/proxy IP ranges</li>
        <li><strong>Anti-bot detection</strong> — Some sites use advanced bot detection (reCAPTCHA, DataDome, PerimeterX) that may block proxy traffic</li>
        <li><strong>DRM content</strong> — DRM-protected media (Netflix, Spotify, etc.) will not stream through the proxy</li>
        <li><strong>WebSocket-heavy apps</strong> — Real-time apps (chat, collaboration tools) may have degraded functionality</li>
        <li><strong>Authentication</strong> — Some sites detect proxy usage and block logins</li>
        <li><strong>JavaScript-heavy SPAs</strong> — Some single-page apps that use <code>location.href</code> for navigation may not work perfectly</li>
      </ul>

      <h2>4. No Warranty on Service Availability</h2>
      <p>
        Veil is provided <strong>without any guarantee of uptime or
        availability</strong>. The Service may be:
      </p>
      <ul>
        <li>Temporarily unavailable due to maintenance, server issues, or traffic spikes</li>
        <li>Rate-limited to prevent abuse</li>
        <li>Modified or discontinued at any time without notice</li>
      </ul>

      <h2>5. Content Accuracy</h2>
      <p>
        Veil is a conduit to third-party websites. We do not verify, endorse, or
        guarantee the accuracy of any content accessed through the proxy. Users
        are responsible for evaluating the reliability of information obtained
        through the Service.
      </p>

      <h2>6. No Endorsement</h2>
      <p>
        The inclusion of any website in our "Unblocker" categories (Search,
        Social, News, etc.) does not constitute an endorsement of that website,
        its content, or its practices. These are simply commonly-accessed sites.
      </p>

      <h2>7. Legal Compliance Responsibility</h2>
      <p>
        <strong>You are solely responsible</strong> for ensuring your use of
        Veil complies with all applicable laws in your jurisdiction, including:
      </p>
      <ul>
        <li>Copyright laws</li>
        <li>Computer fraud and abuse laws</li>
        <li>Export control laws</li>
        <li>School or workplace acceptable use policies</li>
        <li>National censorship laws (in some jurisdictions, bypassing censorship is illegal)</li>
      </ul>
      <p>
        Zelvior Labs is not responsible for any legal consequences resulting
        from your use of the Service.
      </p>

      <h2>8. Security Limitations</h2>
      <p>
        While we implement robust security measures, <strong>no system is
        perfectly secure</strong>. Potential risks include:
      </p>
      <ul>
        <li><strong>Server compromise</strong> — If our server is compromised, session data (in memory) could be exposed</li>
        <li><strong>Traffic analysis</strong> — A sophisticated adversary monitoring our server could potentially correlate traffic</li>
        <li><strong>Bug exploits</strong> — Software bugs may create unexpected data leaks</li>
        <li><strong>Upstream TLS interception</strong> — If a target site uses certificate pinning, our TLS fallback may not work</li>
      </ul>

      <h2>9. Third-Party Links</h2>
      <p>
        Veil provides access to third-party websites. We are not responsible for:
      </p>
      <ul>
        <li>The privacy practices of those websites</li>
        <li>Their terms of service</li>
        <li>Any malware or harmful content they may serve</li>
        <li>Their use of cookies, tracking, or fingerprinting</li>
      </ul>

      <h2>10. Use at Your Own Risk</h2>
      <p>
        The Service is provided free of charge. You use Veil at your own risk.
        Zelvior Labs disclaims all liability for any damages, losses, or
        consequences arising from the use of or inability to use the Service.
      </p>

      <h2>11. Educational Purpose</h2>
      <p>
        Veil is developed as an <strong>educational and research project</strong>{" "}
        by Zelvior Labs to demonstrate:
      </p>
      <ul>
        <li>Proxy architecture and DOM transformation techniques</li>
        <li>Privacy-enhancing web technologies</li>
        <li>Anti-blocking and anti-fingerprinting strategies</li>
        <li>Next.js streaming and edge capabilities</li>
      </ul>
      <p>
        It is not intended to facilitate illegal activity or circumvent
        legitimate security measures.
      </p>

      <h2>12. Contact</h2>
      <p>For questions about this disclaimer:</p>
      <ul>
        <li>Email: <a href="mailto:zelvior@proton.me">zelvior@proton.me</a></li>
        <li>Discord: <a href="https://discord.gg/UQfzQzymc" target="_blank" rel="noreferrer">Join our community</a></li>
      </ul>
    </LegalLayout>
  );
}
