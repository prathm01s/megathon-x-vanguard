import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// The repo keeps one `.env.local` at the root (§3.4); Next.js only reads env files from
// apps/web, so load the root ones too. Values already set (shell, CI, Vercel) win.
// forceReload: Next has already loaded (and cached) apps/web's env files by now.
loadEnvConfig(resolve(__dirname, "../.."), process.env.NODE_ENV !== "production", console, true);

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Phones and laptops on the same Wi-Fi / hotspot open the dev server by IP (`pnpm dev:lan`).
  // Next blocks dev requests from other hostnames unless listed; these are the private ranges.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  cacheComponents: true,
  partialPrefetching: true,
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@toss/engine", "@toss/content", "@toss/db-types"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // TODO(pragya): PWA (§9.4) — add the service worker (Serwist or current Next PWA solution).
};

export default withNextIntl(nextConfig);
