"use client";

import { useEffect } from "react";
import { useProxyStore, ACCENT_COLORS, type AccentColor } from "@/store/proxy-store";

/**
 * Applies appearance customization to the document root.
 *
 * - Sets the accent color via CSS custom properties (--accent-r/g/b)
 * - Applies the theme (light/dark/system)
 * - Applies the font family
 * - Applies the density (padding/spacing)
 *
 * This component renders nothing — it only manipulates the DOM.
 */
export function AppearanceManager() {
  const settings = useProxyStore((s) => s.settings);

  // Apply accent color
  useEffect(() => {
    const accent = ACCENT_COLORS[settings.accentColor as AccentColor] || ACCENT_COLORS.emerald;
    const [r, g, b] = accent.rgb.split(", ").map(Number);
    const root = document.documentElement;
    root.style.setProperty("--accent-r", String(r));
    root.style.setProperty("--accent-g", String(g));
    root.style.setProperty("--accent-b", String(b));
    root.style.setProperty("--accent", accent.value);
    // Override the emerald-based primary color used throughout the UI
    root.style.setProperty("--primary", accent.value);
    // Set a readable foreground (white for most accent colors)
    root.style.setProperty("--primary-foreground", "#ffffff");
  }, [settings.accentColor]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    const apply = (mode: "light" | "dark") => {
      root.classList.toggle("dark", mode === "dark");
    };
    if (settings.theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mq.matches ? "dark" : "light");
      const handler = (e: MediaQueryListEvent) => apply(e.matches ? "dark" : "light");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
    apply(settings.theme);
  }, [settings.theme]);

  // Apply font family
  useEffect(() => {
    const root = document.documentElement;
    const fonts: Record<string, string> = {
      system: "system-ui, -apple-system, sans-serif",
      inter: "'Inter', system-ui, sans-serif",
      geistsans: "var(--font-geist-sans), system-ui, sans-serif",
      geistmono: "var(--font-geist-mono), ui-monospace, monospace",
      serif: "Georgia, 'Times New Roman', serif",
    };
    root.style.setProperty("--veil-font", fonts[settings.fontFamily] || fonts.system);
    root.style.fontFamily = fonts[settings.fontFamily] || fonts.system;
  }, [settings.fontFamily]);

  // Apply density
  useEffect(() => {
    const root = document.documentElement;
    const densities: Record<string, string> = {
      compact: "0.75rem",
      comfortable: "1rem",
      spacious: "1.25rem",
    };
    root.style.setProperty("--veil-density", densities[settings.density] || densities.comfortable);
  }, [settings.density]);

  return null;
}
