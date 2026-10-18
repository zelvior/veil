import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://github.com/zelvior/veil"),
  title: {
    default: "Veil — Private Web Proxy Browser by Zelvior Labs",
    template: "%s · Veil",
  },
  description:
    "Veil is a feature-rich, privacy-first web proxy browser built with Next.js 16. Unblock websites, browse anonymously with rotating browser profiles, tracker blocking, WebRTC leak prevention, and streaming media support. Created by Zelvior Labs.",
  applicationName: "Veil",
  keywords: [
    "Veil",
    "Zelvior",
    "Zelvior Labs",
    "web proxy",
    "website unblocker",
    "private browser",
    "anonymous browsing",
    "anti-blocking",
    "privacy",
    "Next.js proxy",
    "CroxProxy alternative",
  ],
  authors: [
    { name: "Zelvior", url: "https://linktr.ee/zelvior" },
  ],
  creator: "Zelvior",
  publisher: "Zelvior Labs",
  category: "technology",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/favicon.png",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://github.com/zelvior/veil",
    siteName: "Veil Proxy Browser",
    title: "Veil — Private Web Proxy Browser by Zelvior Labs",
    description:
      "Unblock any website with Veil — a high-performance, privacy-first web proxy with multi-tab browsing, tracker blocking, WebRTC leak prevention, and streaming media support. Built by Zelvior Labs.",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Veil — Private Web Proxy Browser",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Veil — Private Web Proxy Browser",
    description:
      "Unblock any website with Veil — privacy-first web proxy with tracker blocking, WebRTC protection, and streaming. By Zelvior Labs.",
    creator: "@zelviorhere",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
