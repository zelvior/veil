"use client";

import { useEffect } from "react";

/**
 * Registers the Veil service worker for PWA offline support.
 * Only registers in production to avoid caching issues during development.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Only register in production — dev mode causes stale cache issues.
    if (process.env.NODE_ENV !== "production") return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
      } catch {
        // SW registration failed — app still works, just no offline support.
      }
    };

    // Register after page load to avoid competing with initial resource fetch.
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
