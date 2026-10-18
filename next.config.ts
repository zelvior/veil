import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // On Vercel, do not use output: "standalone" — Vercel handles the output.
  // For self-hosting/Docker, run `bun run build:standalone` instead.
};

export default nextConfig;
