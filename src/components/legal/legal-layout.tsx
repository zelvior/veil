"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  FileText,
  Cookie,
  Copyright,
  AlertTriangle,
  Users,
  Mail,
  Menu,
  X,
  ArrowLeft,
  Github,
  DiscordIcon,
  YoutubeIcon,
  LinktreeIcon,
} from "@/components/icons";

const NAV_ITEMS = [
  { href: "/legal/about", label: "About", icon: Users },
  { href: "/legal/privacy", label: "Privacy Policy", icon: Shield },
  { href: "/legal/terms", label: "Terms of Service", icon: FileText },
  { href: "/legal/cookies", label: "Cookie Policy", icon: Cookie },
  { href: "/legal/dmca", label: "DMCA", icon: Copyright },
  { href: "/legal/disclaimer", label: "Disclaimer", icon: AlertTriangle },
  { href: "/legal/contact", label: "Contact", icon: Mail },
];

interface LegalLayoutProps {
  children: React.ReactNode;
  title: string;
  lastUpdated: string;
}

export function LegalLayout({ children, title, lastUpdated }: LegalLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((v) => !v);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent"
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Veil" className="h-7 w-7 rounded-md bg-white" />
              <span className="font-bold text-lg">Veil</span>
              <span className="hidden sm:inline text-xs text-muted-foreground border-l border-border pl-2 ml-1">
                by Zelvior Labs
              </span>
            </Link>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to App
          </Link>
        </div>
      </header>

      <div className="flex flex-1 mx-auto w-full max-w-7xl">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "block" : "hidden"
          } lg:block fixed lg:sticky top-14 left-0 z-30 w-64 h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-border bg-white dark:bg-zinc-950 p-4`}
        >
          <nav className="space-y-1">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Legal & Info
            </p>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSidebar}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                      : "text-foreground/70 hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Social links in sidebar */}
          <div className="mt-8 border-t border-border pt-4">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Connect
            </p>
            <div className="flex items-center gap-1 px-2">
              <SocialLink href="https://github.com/zelvior/veil" label="GitHub">
                <Github className="h-4 w-4" />
              </SocialLink>
              <SocialLink href="https://discord.gg/UQfzQzymc" label="Discord">
                <DiscordIcon className="h-4 w-4" />
              </SocialLink>
              <SocialLink href="https://linktr.ee/zelvior" label="Linktree">
                <LinktreeIcon className="h-4 w-4" />
              </SocialLink>
              <SocialLink href="https://youtube.com/@zelviorhere" label="YouTube">
                <YoutubeIcon className="h-4 w-4" />
              </SocialLink>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 top-14 z-20 bg-black/30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 py-8 sm:py-12">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 pb-6 border-b border-border">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
                {title}
              </h1>
              <p className="text-sm text-muted-foreground">
                Last updated: {lastUpdated}
              </p>
            </div>
            <article className="prose prose-zinc dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-8 prose-h3:text-lg prose-h3:font-medium prose-p:leading-relaxed prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-li:leading-relaxed">
              {children}
            </article>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-zinc-950 text-zinc-400">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <img src="/logo.png" alt="Veil" className="h-6 w-6 rounded bg-white" />
                <span className="font-bold text-zinc-200">Veil</span>
              </div>
              <p className="text-xs leading-relaxed">
                Privacy-first web proxy browser by{" "}
                <a
                  href="https://linktr.ee/zelvior"
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-300 hover:text-emerald-400"
                >
                  Zelvior Labs
                </a>
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                Legal
              </h4>
              <ul className="space-y-2 text-xs">
                <li><Link href="/legal/privacy" className="hover:text-emerald-400">Privacy Policy</Link></li>
                <li><Link href="/legal/terms" className="hover:text-emerald-400">Terms of Service</Link></li>
                <li><Link href="/legal/cookies" className="hover:text-emerald-400">Cookie Policy</Link></li>
                <li><Link href="/legal/dmca" className="hover:text-emerald-400">DMCA</Link></li>
                <li><Link href="/legal/disclaimer" className="hover:text-emerald-400">Disclaimer</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                Info
              </h4>
              <ul className="space-y-2 text-xs">
                <li><Link href="/legal/about" className="hover:text-emerald-400">About</Link></li>
                <li><Link href="/legal/contact" className="hover:text-emerald-400">Contact</Link></li>
                <li><a href="https://github.com/zelvior/veil" target="_blank" rel="noreferrer" className="hover:text-emerald-400">GitHub</a></li>
                <li><a href="https://discord.gg/UQfzQzymc" target="_blank" rel="noreferrer" className="hover:text-emerald-400">Discord</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                Connect
              </h4>
              <div className="flex items-center gap-2">
                <SocialLink href="https://github.com/zelvior/veil" label="GitHub"><Github className="h-4 w-4" /></SocialLink>
                <SocialLink href="https://discord.gg/UQfzQzymc" label="Discord"><DiscordIcon className="h-4 w-4" /></SocialLink>
                <SocialLink href="https://linktr.ee/zelvior" label="Linktree"><LinktreeIcon className="h-4 w-4" /></SocialLink>
                <SocialLink href="https://youtube.com/@zelviorhere" label="YouTube"><YoutubeIcon className="h-4 w-4" /></SocialLink>
              </div>
            </div>
          </div>
          <div className="border-t border-zinc-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">
              © 2024 Zelvior Labs. Licensed under Apache 2.0.
            </p>
            <p className="text-xs text-zinc-500">
              Built by{" "}
              <a href="https://linktr.ee/zelvior" target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-emerald-400">Zelvior</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-all hover:text-emerald-400 hover:bg-zinc-800"
    >
      {children}
    </a>
  );
}
