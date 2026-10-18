import type { Metadata } from "next";
import Link from "next/link";
import {
  Shield,
  FileText,
  Cookie,
  Copyright,
  AlertTriangle,
  Users,
  Mail,
  ArrowLeft,
  Github,
  DiscordIcon,
  YoutubeIcon,
  LinktreeIcon,
} from "@/components/icons";

export const metadata: Metadata = {
  title: "Legal & Information",
  description: "Veil legal documents, policies, and information pages — Privacy Policy, Terms, Cookies, DMCA, and more.",
};

const PAGES = [
  {
    href: "/legal/about",
    title: "About Veil",
    description: "Learn about Veil's mission, features, tech stack, and the team behind it.",
    icon: Users,
  },
  {
    href: "/legal/privacy",
    title: "Privacy Policy",
    description: "How we handle your data, cookies, and browsing privacy. Our no-logging commitment.",
    icon: Shield,
  },
  {
    href: "/legal/terms",
    title: "Terms of Service",
    description: "The rules and conditions for using the Veil web proxy service.",
    icon: FileText,
  },
  {
    href: "/legal/cookies",
    title: "Cookie Policy",
    description: "How cookies work in the proxy, what we set, and how to manage them.",
    icon: Cookie,
  },
  {
    href: "/legal/dmca",
    title: "DMCA Policy",
    description: "How to report copyright infringement and our takedown procedure.",
    icon: Copyright,
  },
  {
    href: "/legal/disclaimer",
    title: "Disclaimer",
    description: "Important limitations and warnings about using the Veil proxy service.",
    icon: AlertTriangle,
  },
  {
    href: "/legal/contact",
    title: "Contact",
    description: "Get in touch with Zelvior Labs via email, Discord, GitHub, and more.",
    icon: Mail,
  },
];

export default function LegalIndexPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Veil" className="h-7 w-7 rounded-md bg-white" />
            <span className="font-bold text-lg">Veil</span>
            <span className="hidden sm:inline text-xs text-muted-foreground border-l border-border pl-2 ml-1">
              by Zelvior Labs
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to App
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-12 sm:py-16">
        <div className="text-center mb-12">
          <img
            src="/logo.png"
            alt="Veil"
            className="h-20 w-20 mx-auto rounded-2xl shadow-md mb-6 bg-white"
          />
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Legal &amp; Information
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Transparency is core to our mission. Find all our policies, terms,
            and information pages below.
          </p>
        </div>

        {/* Page grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PAGES.map((page) => {
            const Icon = page.icon;
            return (
              <Link
                key={page.href}
                href={page.href}
                className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-emerald-500/30 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-3">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="font-semibold mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {page.title}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {page.description}
                </p>
              </Link>
            );
          })}
        </div>

        {/* Quick links section */}
        <div className="mt-16 pt-8 border-t border-border">
          <h2 className="text-lg font-semibold mb-6 text-center">Connect with Zelvior Labs</h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <SocialCard href="https://github.com/zelvior/veil" label="GitHub" icon={<Github className="h-5 w-5" />} />
            <SocialCard href="https://discord.gg/UQfzQzymc" label="Discord" icon={<DiscordIcon className="h-5 w-5" />} />
            <SocialCard href="https://linktr.ee/zelvior" label="Linktree" icon={<LinktreeIcon className="h-5 w-5" />} />
            <SocialCard href="https://youtube.com/@zelviorhere" label="YouTube" icon={<YoutubeIcon className="h-5 w-5" />} />
            <SocialCard href="mailto:zelvior@proton.me" label="Email" icon={<Mail className="h-5 w-5" />} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-zinc-950 text-zinc-400">
        <div className="mx-auto max-w-5xl px-4 py-6 text-center">
          <p className="text-xs text-zinc-500">
            © 2024 Zelvior Labs. Licensed under Apache 2.0. Built by{" "}
            <a href="https://linktr.ee/zelvior" target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-emerald-400">
              Zelvior
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function SocialCard({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-all hover:border-emerald-500/30 hover:text-emerald-600 dark:hover:text-emerald-400"
    >
      {icon}
      {label}
    </a>
  );
}
