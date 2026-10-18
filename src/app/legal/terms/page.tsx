import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Veil Terms of Service — The terms and conditions for using the Veil web proxy by Zelvior Labs.",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="October 2024">
      <p>
        Welcome to <strong>Veil</strong> ("the Service"), operated by{" "}
        <strong>Zelvior Labs</strong> ("we", "us", "our"). By accessing or using
        the Service, you agree to be bound by these Terms of Service ("Terms").
        If you do not agree to these Terms, please do not use the Service.
      </p>

      <h2>1. Description of Service</h2>
      <p>
        Veil is a web proxy application that allows users to browse the internet
        privately through a server-side proxy engine. The Service:
      </p>
      <ul>
        <li>Fetches web content server-side and rewrites it for proxy rendering</li>
        <li>Provides multi-tab browsing, bookmarks, history, and an unblocker interface</li>
        <li>Blocks trackers, ads, and prevents WebRTC IP leaks</li>
        <li>Is provided free of charge for personal, non-commercial use</li>
      </ul>

      <h2>2. Acceptable Use</h2>
      <p>You agree to use Veil only for lawful purposes. You <strong>must not</strong> use the Service to:</p>
      <ul>
        <li>Access or distribute illegal content, including child exploitation material, terrorist content, or content that infringes intellectual property rights</li>
        <li>Engage in cyberattacks, hacking, or unauthorized access to systems</li>
        <li>Distribute malware, ransomware, or other malicious software</li>
        <li>Harass, stalk, or harm any person</li>
        <li>Attempt to overload, crash, or disrupt the Service or its infrastructure</li>
        <li>Bypass security measures or authentication systems of the Service itself</li>
        <li>Use the Service for commercial proxy-reselling or as part of a paid service without written permission</li>
        <li>Scrape or data-mine websites in violation of their terms of service</li>
      </ul>

      <h2>3. No Logging Policy</h2>
      <p>
        Veil does <strong>not</strong> log your browsing activity, IP address,
        or personal data on our servers. However:
      </p>
      <ul>
        <li>Your <strong>browsing history, bookmarks, and settings are stored locally</strong> in your browser via an embedded SQLite database</li>
        <li><strong>Proxy cookies</strong> are stored temporarily in server memory and expire after 30 minutes of inactivity</li>
        <li>We may be compelled to provide <strong>limited server logs</strong> (if any exist) in response to valid legal requests</li>
      </ul>

      <h2>4. Intellectual Property</h2>
      <p>
        The Veil software is licensed under the{" "}
        <strong>Apache License 2.0</strong>. You are free to:
      </p>
      <ul>
        <li>Use, modify, and distribute the software</li>
        <li>Use it commercially (with attribution)</li>
        <li>Submit patent grants</li>
      </ul>
      <p>
        However, websites accessed through the proxy retain their own
        intellectual property rights. Veil does not claim ownership of any
        content accessed through the Service.
      </p>

      <h2>5. Disclaimer of Warranties</h2>
      <p>
        The Service is provided <strong>"AS IS"</strong> and "AS AVAILABLE"
        without warranties of any kind, either express or implied, including but
        not limited to:
      </p>
      <ul>
        <li>Warranties of merchantability or fitness for a particular purpose</li>
        <li>That the Service will be uninterrupted, error-free, or secure</li>
        <li>That any website will be accessible through the proxy</li>
        <li>That your anonymity will be guaranteed in all circumstances</li>
      </ul>

      <h2>6. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, Zelvior Labs shall not be liable
        for:
      </p>
      <ul>
        <li>Indirect, incidental, special, or consequential damages</li>
        <li>Loss of profits, data, or privacy</li>
        <li>Damages resulting from your use of or inability to use the Service</li>
        <li>Actions taken by third parties based on information obtained through the Service</li>
        <li>Any content accessed, transmitted, or stored through the Service</li>
      </ul>

      <h2>7. Third-Party Websites</h2>
      <p>
        Veil provides access to third-party websites. We do not control and are
        not responsible for:
      </p>
      <ul>
        <li>The content, accuracy, or legality of third-party websites</li>
        <li>The privacy practices of third-party websites</li>
        <li>Any damages resulting from your interactions with third-party websites</li>
        <li>The availability of any specific website through the proxy (some sites block proxy IPs)</li>
      </ul>

      <h2>8. Service Availability</h2>
      <p>
        We strive to maintain high availability but do not guarantee:
      </p>
      <ul>
        <li>That the Service will be available at all times</li>
        <li>That any particular website will be accessible (some sites actively block proxy traffic)</li>
        <li>That media streaming will work for all sites (DRM-protected content may not function)</li>
      </ul>
      <p>
        We reserve the right to modify, suspend, or discontinue the Service at
        any time without notice.
      </p>

      <h2>9. Termination</h2>
      <p>
        You may stop using the Service at any time. We may terminate or restrict
        access to the Service if we believe you have violated these Terms. Upon
        termination, all ephemeral session data is automatically deleted.
      </p>

      <h2>10. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. We will notify users of
        material changes by updating the "Last updated" date. Continued use of
        the Service after changes constitutes acceptance of the new Terms.
      </p>

      <h2>11. Governing Law</h2>
      <p>
        These Terms are governed by applicable international laws. Any disputes
        will be resolved through good-faith negotiation, and if unresolved,
        through arbitration or the appropriate legal jurisdiction.
      </p>

      <h2>12. Contact</h2>
      <p>For questions about these Terms:</p>
      <ul>
        <li>Email: <a href="mailto:zelvior@proton.me">zelvior@proton.me</a></li>
        <li>GitHub Issues: <a href="https://github.com/zelvior/veil/issues" target="_blank" rel="noreferrer">github.com/zelvior/veil/issues</a></li>
      </ul>
    </LegalLayout>
  );
}
