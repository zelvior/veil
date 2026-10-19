"use client";

import { useEffect, useRef } from "react";
import { useProxyStore, type Tab } from "@/store/proxy-store";
import { encodeUrl, hostnameOf } from "@/lib/proxy";
import { Loader2, ShieldCheck, ZoomIn, ZoomOut } from "lucide-react";
import { NewTabPageContent } from "./new-tab-page";
import { FindInPage } from "./find-in-page";

interface Props {
  tab: Tab;
}

export function ProxyView({ tab }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const onProxiedNavigate = useProxyStore((s) => s.onProxiedNavigate);
  const newTab = useProxyStore((s) => s.newTab);
  const updateTab = useProxyStore((s) => s.updateTab);
  const browserProfile = useProxyStore((s) => s.settings.browserProfile);
  const findInPageOpen = useProxyStore((s) => s.findInPageOpen);
  const closeFindInPage = useProxyStore((s) => s.closeFindInPage);
  const toggleFindInPage = useProxyStore((s) => s.toggleFindInPage);
  const zoomLevels = useProxyStore((s) => s.zoomLevels);
  const zoomIn = useProxyStore((s) => s.zoomIn);
  const zoomOut = useProxyStore((s) => s.zoomOut);
  const zoomReset = useProxyStore((s) => s.zoomReset);
  const setHoveredUrl = useProxyStore((s) => s.setHoveredUrl);

  const hasUrl = Boolean(tab.url);
  const zoom = zoomLevels[tab.id] || 1;
  const proxiedSrc = hasUrl
    ? `/api/proxy?url=${encodeUrl(tab.url)}&ua=${encodeURIComponent(browserProfile)}`
    : "";

  // Timeout fallback so the spinner never gets stuck.
  useEffect(() => {
    if (!tab.loading) return;
    const t = setTimeout(() => updateTab(tab.id, { loading: false }), 15000);
    return () => clearTimeout(t);
  }, [tab.loading, tab.id, tab.reloadKey, updateTab]);

  // Listen for messages from the iframe (navigation, link hovers, find results).
  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      const data = ev.data;
      if (!data) return;
      if (data.__proxy) {
        if (data.type === "navigate") {
          onProxiedNavigate(tab.id, data.url, data.title || "");
        } else if (data.type === "open") {
          newTab(data.url);
        }
      }
      // Link hover messages from the interceptor for the status bar.
      if (data.__veilHover) {
        setHoveredUrl(data.url || null);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [tab.id, onProxiedNavigate, newTab, setHoveredUrl]);

  // Apply zoom to the iframe by injecting a CSS transform.
  useEffect(() => {
    if (!hasUrl) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const applyZoom = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        // Remove old zoom style
        const old = doc.getElementById("__veil_zoom");
        if (old) old.remove();
        if (zoom === 1) return;
        const style = doc.createElement("style");
        style.id = "__veil_zoom";
        style.textContent = `html { zoom: ${zoom} !important; -webkit-zoom: ${zoom} !important; }`;
        doc.head?.appendChild(style);
      } catch {
        // Cross-origin — can't apply zoom. Retry shortly.
      }
    };

    // Apply after iframe loads.
    iframe.addEventListener("load", applyZoom);
    setTimeout(applyZoom, 500);
    return () => iframe.removeEventListener("load", applyZoom);
  }, [zoom, hasUrl, tab.reloadKey]);

  // New-tab page when no URL set.
  if (!hasUrl) {
    return (
      <div className="relative flex-1 overflow-auto bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-emerald-950/20">
        <NewTabPageContent tab={tab} />
      </div>
    );
  }

  const zoomPct = Math.round(zoom * 100);

  return (
    <div className="relative flex-1 bg-white dark:bg-zinc-950 overflow-hidden flex flex-col">
      {/* Find in Page overlay */}
      <FindInPage open={findInPageOpen} onClose={closeFindInPage} />

      {/* Loading bar */}
      {tab.loading && (
        <div className="absolute top-0 left-0 right-0 z-20 h-0.5 overflow-hidden">
          <div className="h-full w-full bg-emerald-500 animate-pulse" />
        </div>
      )}

      {/* Loading overlay */}
      {tab.loading && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-zinc-950/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-emerald-600 dark:text-emerald-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm font-medium">Loading {hostnameOf(tab.url)}…</p>
          </div>
        </div>
      )}

      {/* The iframe */}
      <iframe
        ref={iframeRef}
        key={tab.reloadKey}
        src={proxiedSrc}
        title={tab.title}
        className="flex-1 w-full border-0 bg-white"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
        referrerPolicy="no-referrer"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />

      {/* Zoom controls (bottom-left) */}
      {zoom !== 1 && (
        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-lg bg-zinc-900/90 px-2 py-1 text-white shadow-lg">
          <button
            onClick={() => zoomOut(tab.id)}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-700"
            title="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => zoomReset(tab.id)}
            className="text-xs font-medium tabular-nums px-1 hover:text-emerald-400"
            title="Reset zoom"
          >
            {zoomPct}%
          </button>
          <button
            onClick={() => zoomIn(tab.id)}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-700"
            title="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Proxied badge (bottom-right) */}
      <div className="absolute bottom-2 right-2 z-10 pointer-events-none">
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-medium text-white shadow">
          <ShieldCheck className="h-3 w-3" />
          Proxied
        </div>
      </div>
    </div>
  );
}
