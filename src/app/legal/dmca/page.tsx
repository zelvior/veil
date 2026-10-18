import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "DMCA Policy",
  description: "Veil DMCA Policy — How to report copyright infringement and our takedown procedure.",
};

export default function DmcaPage() {
  return (
    <LegalLayout title="DMCA Policy" lastUpdated="October 2024">
      <p>
        <strong>Zelvior Labs</strong> respects the intellectual property rights
        of others and expects users of the Veil proxy service ("the Service")
        to do the same. This policy describes how to report copyright
        infringement under the Digital Millennium Copyright Act (DMCA).
      </p>

      <h2>1. Veil's Role as a Proxy</h2>
      <p>
        Veil is a <strong>transparent web proxy</strong>. We do not host, store,
        or cache any content from third-party websites on our servers. When you
        access a website through Veil:
      </p>
      <ul>
        <li>The content is fetched <strong>on-the-fly</strong> from the original website</li>
        <li>It is <strong>not stored</strong> on our servers after delivery to your browser</li>
        <li>We <strong>do not control</strong> the content of third-party websites</li>
        <li>We <strong>do not index</strong> or make content searchable</li>
      </ul>
      <p>
        Because we do not host content, the appropriate party to contact about
        infringing content is typically the <strong>hosting website itself</strong>.
      </p>

      <h2>2. Filing a DMCA Takedown Notice</h2>
      <p>
        If you believe that content accessible through Veil infringes your
        copyright, you may file a DMCA notice. To be valid under 17 U.S.C. § 512,
        your notice must include:
      </p>
      <ol>
        <li>
          <strong>Identification of the copyrighted work</strong> — A description
          of the original work that you claim has been infringed. If multiple
          works, provide a representative list.
        </li>
        <li>
          <strong>Identification of the infringing material</strong> — The
          specific URL accessed through Veil (e.g.,{" "}
          <code>veil.app/api/proxy?url=...</code>) and the original website URL.
        </li>
        <li>
          <strong>Your contact information</strong> — Full name, mailing
          address, telephone number, and email address.
        </li>
        <li>
          <strong>A statement of good faith</strong> — "I have a good faith
          belief that use of the copyrighted materials described above as
          allegedly infringing is not authorized by the copyright owner, its
          agent, or the law."
        </li>
        <li>
          <strong>A statement of accuracy</strong> — "I swear, under penalty of
          perjury, that the information in the notification is accurate and that
          I am the copyright owner or am authorized to act on behalf of the
          owner of an exclusive right that is allegedly infringed."
        </li>
        <li>
          <strong>Physical or electronic signature</strong> — Of the copyright
          owner or a person authorized to act on their behalf.
        </li>
      </ol>

      <h2>3. Where to Send DMCA Notices</h2>
      <p>Send your DMCA notice to our designated copyright agent:</p>
      <div className="not-prose rounded-lg border border-border bg-muted/50 p-4 my-4">
        <p className="font-semibold">Zelvior Labs — DMCA Agent</p>
        <p className="text-sm mt-2">
          Email:{" "}
          <a href="mailto:zelvior@proton.me" className="text-emerald-600 dark:text-emerald-400 font-medium">
            zelvior@proton.me
          </a>
        </p>
        <p className="text-sm mt-1">
          Subject line: <code>DMCA Takedown Notice</code>
        </p>
      </div>
      <p>
        We aim to respond to DMCA notices within <strong>48-72 hours</strong>.
      </p>

      <h2>4. What We Can and Cannot Do</h2>
      <h3>What We Can Do</h3>
      <ul>
        <li><strong>Block specific URLs</strong> — We can add specific target URLs to a blocklist so they cannot be accessed through the proxy</li>
        <li><strong>Block specific domains</strong> — We can block entire domains if they are primarily used for copyright infringement</li>
        <li><strong>Respond promptly</strong> — We will acknowledge and process valid notices</li>
      </ul>
      <h3>What We Cannot Do</h3>
      <ul>
        <li><strong>Remove content from the original website</strong> — We are not the host; the content remains on the origin server</li>
        <li><strong>Identify individual users</strong> — We do not log IP addresses or user identities, so we cannot identify who accessed specific content</li>
        <li><strong>Process invalid notices</strong> — Notices that do not meet DMCA requirements will be rejected</li>
      </ul>

      <h2>5. Counter-Notification</h2>
      <p>
        If you believe your content was wrongly blocked due to a DMCA notice,
        you may file a counter-notification. It must include:
      </p>
      <ol>
        <li>Identification of the blocked material and its location</li>
        <li>A statement of good faith belief that the block was a mistake</li>
        <li>Your consent to the jurisdiction of the appropriate federal court</li>
        <li>Your physical or electronic signature</li>
      </ol>
      <p>
        Send counter-notifications to{" "}
        <a href="mailto:zelvior@proton.me">zelvior@proton.me</a> with the
        subject line <code>DMCA Counter-Notice</code>.
      </p>

      <h2>6. Repeat Infringer Policy</h2>
      <p>
        Since Veil does not track user identities, we cannot identify
        "repeat infringers" in the traditional sense. However, we will block
        access to domains that are repeatedly the subject of valid DMCA notices.
      </p>

      <h2>7. False Claims</h2>
      <p>
        Filing a false DMCA notice is a violation of federal law (17 U.S.C. §
        512(f)) and may result in liability for damages. Make sure you have a
        good faith belief before filing.
      </p>

      <h2>8. Alternative: Contact the Origin Website</h2>
      <p>
        In many cases, the most effective action is to contact the{" "}
        <strong>original website's DMCA agent</strong> directly. They have the
        ability to actually remove the infringing content from their servers.
        Veil can only block proxy access, not remove the source content.
      </p>

      <h2>9. Contact</h2>
      <p>For any DMCA-related questions:</p>
      <ul>
        <li>Email: <a href="mailto:zelvior@proton.me">zelvior@proton.me</a></li>
        <li>GitHub: <a href="https://github.com/zelvior/veil/issues" target="_blank" rel="noreferrer">Report via GitHub Issues</a></li>
      </ul>
    </LegalLayout>
  );
}
