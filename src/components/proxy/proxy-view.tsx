"use client";

import { useEffect, useRef } from "react";
import { useProxyStore, type Tab } from "@/store/proxy-store";
import { encodeUrl, hostnameOf } from "@/lib/proxy";
import { Loader2, ShieldCheck } from "lucide-react";
import { NewTabPageContent } from "./new-tab-page";

interface Props {
  tab: Tab;
}

export function ProxyView({ tab }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const onProxiedNavigate = useProxyStore((s) => s.onProxiedNavigate);
  const newTab = useProxyStore((s) => s.newTab);
  const updateTab = useProxyStore((s) => s.updateTab);
  const browserProfile = useProxyStore((s) => s.settings.browserProfile);

  const hasUrl = Boolean(tab.url);
  // Unified proxy route: /api/proxy?url=<base64url>&ua=<profile>
  // The server detects content-type and either rewrites HTML/CSS/JS or
  // streams binary/media directly with Range support.
  const proxiedSrc = hasUrl
    ? `/api/proxy?url=${encodeUrl(tab.url)}&ua=${encodeURIComponent(browserProfile)}`
    : "";

  // Timeout fallback so the spinner never gets stuck if a page never signals.
  useEffect(() => {
    if (!tab.loading) return;
    const t = setTimeout(() => {
      updateTab(tab.id, { loading: false });
    }, 15000);
    return () => clearTimeout(t);
  }, [tab.loading, tab.id, tab.reloadKey, updateTab]);

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      const data = ev.data;
      if (!data || !data.__proxy) return;
      if (data.type === "navigate") {
        onProxiedNavigate(tab.id, data.url, data.title || "");
      } else if (data.type === "open") {
        newTab(data.url);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [tab.id, onProxiedNavigate, newTab]);

  // New-tab page when no URL set
  if (!hasUrl) {
    return (
      <div className="relative flex-1 overflow-auto bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-emerald-950/20">
        <NewTabPageContent tab={tab} />
      </div>
    );
  }

  return (
    <div className="relative flex-1 bg-white dark:bg-zinc-950 overflow-hidden">
      {tab.loading && (
        <div className="absolute top-0 left-0 right-0 z-20 h-0.5 overflow-hidden">
          <div className="h-full w-full bg-emerald-500 animate-pulse" />
        </div>
      )}
      {tab.loading && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-zinc-950/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-emerald-600 dark:text-emerald-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm font-medium">
              Loading {hostnameOf(tab.url)}…
            </p>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        key={tab.reloadKey}
        src={proxiedSrc}
        title={tab.title}
        className="h-full w-full border-0 bg-white"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
        referrerPolicy="no-referrer"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
      <div className="absolute bottom-2 right-2 z-10 pointer-events-none">
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-medium text-white shadow">
          <ShieldCheck className="h-3 w-3" />
          Proxied
        </div>
      </div>
    </div>
  );
}
