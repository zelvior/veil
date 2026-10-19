"use client";

import { useState } from "react";
import { useProxyStore, SEARCH_ENGINES } from "@/store/proxy-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sun, Moon, Monitor, Shield, Globe, Trash2, Info } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { BROWSER_PROFILES } from "@/lib/browser-profiles";

export function SettingsDialog() {
  const open = useProxyStore((s) => s.settingsOpen);
  const close = useProxyStore((s) => s.closeSettings);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden" aria-describedby={undefined}>
        {open ? <SettingsBody /> : null}
      </DialogContent>
    </Dialog>
  );
}

function SettingsBody() {
  const settings = useProxyStore((s) => s.settings);
  const setSettings = useProxyStore((s) => s.setSettings);
  const setHistory = useProxyStore((s) => s.setHistory);
  const { toast } = useToast();
  const [local, setLocal] = useState(settings);

  const save = async (patch: Partial<typeof local>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    setSettings(patch);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchEngine: next.searchEngine,
        showBookmarksBar: String(next.showBookmarksBar),
        theme: next.theme,
        browserProfile: next.browserProfile,
      }),
    });
  };

  const clearHistory = async () => {
    await fetch("/api/history?all=1", { method: "DELETE" });
    setHistory([]);
    toast({ title: "All history cleared" });
  };

  const clearCookies = async () => {
    await fetch("/api/proxy/clear", { method: "POST" });
    toast({ title: "Cookies & sessions cleared" });
  };

  return (
    <>
      <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription>
          Configure your proxy browsing experience
        </DialogDescription>
      </DialogHeader>

      <Tabs defaultValue="general" className="flex flex-col sm:flex-row min-h-[400px]">
        <TabsList className="flex h-auto flex-col items-stretch rounded-none border-b sm:border-b-0 sm:border-r border-border bg-transparent p-2 gap-1 sm:w-44">
          <TabsTrigger
            value="general"
            className="justify-start data-[state=active]:bg-accent"
          >
            General
          </TabsTrigger>
          <TabsTrigger
            value="privacy"
            className="justify-start data-[state=active]:bg-accent"
          >
            Privacy
          </TabsTrigger>
          <TabsTrigger
            value="about"
            className="justify-start data-[state=active]:bg-accent"
          >
            About
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 p-6 overflow-y-auto max-h-[60vh]">
          <TabsContent value="general" className="mt-0 space-y-6">
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold">Search engine</h3>
              </div>
              <Select
                value={local.searchEngine}
                onValueChange={(v) => save({ searchEngine: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SEARCH_ENGINES).map(([name, url]) => (
                    <SelectItem key={name} value={url}>
                      {name.charAt(0).toUpperCase() + name.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used when you type a search query (not a URL) into the address bar.
              </p>
            </section>

            <Separator />

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold">Browser profile</h3>
              </div>
              <Select
                value={local.browserProfile}
                onValueChange={(v) => save({ browserProfile: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BROWSER_PROFILES.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The User-Agent and browser headers sent to websites. If a site
                blocks one profile, try another — some sites reject non-Chrome
                or mobile UAs.
              </p>
            </section>

            <Separator />

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Appearance</h3>
              <div className="grid grid-cols-3 gap-2">
                <ThemeCard
                  label="Light"
                  icon={<Sun className="h-4 w-4" />}
                  active={local.theme === "light"}
                  onClick={() => save({ theme: "light" })}
                />
                <ThemeCard
                  label="Dark"
                  icon={<Moon className="h-4 w-4" />}
                  active={local.theme === "dark"}
                  onClick={() => save({ theme: "dark" })}
                />
                <ThemeCard
                  label="System"
                  icon={<Monitor className="h-4 w-4" />}
                  active={local.theme === "system"}
                  onClick={() => save({ theme: "system" })}
                />
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Show bookmarks bar</Label>
                  <p className="text-xs text-muted-foreground">
                    Display saved bookmarks beneath the address bar
                  </p>
                </div>
                <Switch
                  checked={local.showBookmarksBar}
                  onCheckedChange={(v) => save({ showBookmarksBar: v })}
                />
              </div>
            </section>
          </TabsContent>

          <TabsContent value="privacy" className="mt-0 space-y-6">
            <section className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold">How the proxy works</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every request you make is fetched server-side by this app, then
                rewritten so resources (images, CSS, scripts) also flow through
                the proxy. The destination site never sees your real IP — it
                sees this server&apos;s IP instead.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Browsing data</h3>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">History</p>
                  <p className="text-xs text-muted-foreground">
                    Clear all stored browsing history
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={clearHistory}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Clear
                </Button>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Cookies &amp; sessions</p>
                  <p className="text-xs text-muted-foreground">
                    Clear stored proxy cookies (forces re-login on all sites)
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={clearCookies}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Clear
                </Button>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Incognito tabs</p>
                  <p className="text-xs text-muted-foreground">
                    Incognito tabs never record history or bookmarks
                  </p>
                </div>
                <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs text-violet-600 dark:text-violet-400">
                  Auto
                </span>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="about" className="mt-0 space-y-4">
            <section className="space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Veil Logo"
                  className="h-12 w-12 rounded-xl shadow-sm bg-white"
                />
                <div>
                  <h3 className="font-semibold">Veil Proxy Browser</h3>
                  <p className="text-xs text-muted-foreground">v1.0.0 · Next.js 16</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A feature-rich web proxy that lets you browse the web privately
                from a single page. Built with Next.js, Prisma, and the shadcn/ui
                component library.
              </p>
              <p className="text-xs text-muted-foreground">
                Built by{" "}
                <a
                  href="https://linktr.ee/zelvior"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Zelvior Labs
                </a>{" "}
                ·{" "}
                <a
                  href="https://github.com/zelvior/veil"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  GitHub
                </a>{" "}
                · Apache 2.0
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-2">
                <a href="/legal/about" className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline">About</a>
                <a href="/legal/privacy" className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline">Privacy</a>
                <a href="/legal/terms" className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline">Terms</a>
                <a href="/legal/cookies" className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline">Cookies</a>
                <a href="/legal/dmca" className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline">DMCA</a>
                <a href="/legal/disclaimer" className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline">Disclaimer</a>
                <a href="/legal/contact" className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline">Contact</a>
              </div>
            </section>
            <Separator />
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4" /> Features
              </div>
              <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-5">
                <li>Website unblocker with category shortcuts</li>
                <li>7 browser profiles (Chrome, Firefox, Safari, Edge, mobile)</li>
                <li>Cookie &amp; session forwarding (logins persist)</li>
                <li>Multi-tab browsing with per-tab history</li>
                <li>Incognito mode</li>
                <li>Bookmarks &amp; quick links</li>
                <li>Searchable history grouped by day</li>
                <li>Command palette (Ctrl+K)</li>
                <li>Light / dark / system theme</li>
                <li>HTML, CSS &amp; JS rewriting engine</li>
                <li>GET &amp; POST form submissions through the proxy</li>
                <li>Keyboard shortcuts</li>
              </ul>
            </section>
          </TabsContent>
        </div>
      </Tabs>
    </>
  );
}

function ThemeCard({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all",
        active
          ? "border-emerald-500 bg-emerald-500/5"
          : "border-border hover:border-emerald-500/40"
      )}
    >
      <span className={cn(active ? "text-emerald-500" : "text-muted-foreground")}>
        {icon}
      </span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
