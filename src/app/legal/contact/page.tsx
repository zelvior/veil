import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Zelvior Labs — email, Discord, GitHub, YouTube, and more.",
};

export default function ContactPage() {
  return (
    <LegalLayout title="Contact" lastUpdated="October 2024">
      <p>
        We'd love to hear from you! Whether you have a question, feature
        request, bug report, or just want to say hi, here are all the ways to
        reach <strong>Zelvior Labs</strong>.
      </p>

      <h2>📧 Email</h2>
      <p>
        For direct, private communication:
      </p>
      <div className="not-prose rounded-lg border border-border bg-muted/50 p-4 my-4">
        <a
          href="mailto:zelvior@proton.me"
          className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
        >
          <span className="text-2xl">📧</span>
          zelvior@proton.me
        </a>
      </div>
      <p>
        We use <strong>Proton Mail</strong> for end-to-end encrypted email.
        Response time: typically within 24-48 hours.
      </p>

      <h2>💬 Discord</h2>
      <p>
        Join our community Discord server for real-time chat, support, and
        updates:
      </p>
      <div className="not-prose rounded-lg border border-border bg-muted/50 p-4 my-4">
        <a
          href="https://discord.gg/UQfzQzymc"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 text-[#5865F2] font-medium hover:underline"
        >
          <span className="text-2xl">💬</span>
          discord.gg/UQfzQzymc
        </a>
      </div>
      <p>
        Our Discord is the <strong>fastest way</strong> to get help, share
        feedback, and connect with other Veil users.
      </p>

      <h2>🐙 GitHub</h2>
      <p>
        For bug reports, feature requests, and code contributions:
      </p>
      <div className="not-prose rounded-lg border border-border bg-muted/50 p-4 my-4 space-y-3">
        <a
          href="https://github.com/zelvior/veil"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 font-medium hover:underline"
        >
          <span className="text-2xl">📦</span>
          github.com/zelvior/veil — Main Repository
        </a>
        <a
          href="https://github.com/zelvior/veil/issues"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 font-medium hover:underline"
        >
          <span className="text-2xl">🐛</span>
          github.com/zelvior/veil/issues — Report a Bug
        </a>
        <a
          href="https://github.com/zelvior/veil/pulls"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 font-medium hover:underline"
        >
          <span className="text-2xl">🔧</span>
          github.com/zelvior/veil/pulls — Submit a PR
        </a>
      </div>

      <h2>▶️ YouTube</h2>
      <p>
        For tutorials, demos, and development updates:
      </p>
      <div className="not-prose rounded-lg border border-border bg-muted/50 p-4 my-4">
        <a
          href="https://youtube.com/@zelviorhere"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 text-[#FF0000] font-medium hover:underline"
        >
          <span className="text-2xl">▶️</span>
          youtube.com/@zelviorhere
        </a>
      </div>

      <h2>🔗 Linktree</h2>
      <p>
        Find all our links in one place:
      </p>
      <div className="not-prose rounded-lg border border-border bg-muted/50 p-4 my-4">
        <a
          href="https://linktr.ee/zelvior"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 text-[#39E09B] font-medium hover:underline"
        >
          <span className="text-2xl">🔗</span>
          linktr.ee/zelvior
        </a>
      </div>

      <h2>🎓 ORCID</h2>
      <p>
        Zelvior's academic/research profile:
      </p>
      <div className="not-prose rounded-lg border border-border bg-muted/50 p-4 my-4">
        <a
          href="https://orcid.org/0009-0009-2376-367X"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 text-[#a6ce39] font-medium hover:underline"
        >
          <span className="text-2xl">🎓</span>
          orcid.org/0009-0009-2376-367X
        </a>
      </div>

      <h2>📦 NPM</h2>
      <p>
        Zelvior's NPM packages:
      </p>
      <div className="not-prose rounded-lg border border-border bg-muted/50 p-4 my-4">
        <a
          href="https://www.npmjs.com/~zelnpm"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 text-[#cb3837] font-medium hover:underline"
        >
          <span className="text-2xl">📦</span>
          npmjs.com/~zelnpm
        </a>
      </div>

      <h2>📋 What to Include in a Bug Report</h2>
      <p>
        To help us fix issues quickly, please include:
      </p>
      <ol>
        <li><strong>Steps to reproduce</strong> — What did you do?</li>
        <li><strong>Expected behavior</strong> — What should have happened?</li>
        <li><strong>Actual behavior</strong> — What actually happened?</li>
        <li><strong>The URL you were trying to proxy</strong> (if applicable)</li>
        <li><strong>Browser profile</strong> you were using (Settings → Browser Profile)</li>
        <li><strong>Screenshots</strong> (if applicable)</li>
        <li><strong>Console errors</strong> (F12 → Console tab)</li>
      </ol>

      <h2>🤝 Response Times</h2>
      <table>
        <thead>
          <tr><th>Channel</th><th>Typical Response Time</th></tr>
        </thead>
        <tbody>
          <tr><td>Discord</td><td>Minutes to hours</td></tr>
          <tr><td>GitHub Issues</td><td>24-48 hours</td></tr>
          <tr><td>Email</td><td>24-48 hours</td></tr>
          <tr><td>YouTube comments</td><td>1-3 days</td></tr>
        </tbody>
      </table>

      <h2>⚠️ What We Can't Help With</h2>
      <ul>
        <li>Bypassing specific website blocks (some sites just don't work through proxies — see our <a href="/legal/disclaimer">Disclaimer</a>)</li>
        <li>Legal advice</li>
        <li>Requests to identify other users (we don't log user activity)</li>
        <li>Requests to modify Veil for illegal purposes</li>
      </ul>

      <h2>📍 Office Hours</h2>
      <p>
        Zelvior Labs is a small, distributed team. We're most active on
        Discord during <strong>UTC daytime hours</strong>. We appreciate your
        patience across time zones!
      </p>
    </LegalLayout>
  );
}
