import type { NextConfig } from "next";

// Static SPA build for GitHub Pages.
// - output: 'export' -> fully static HTML/JS in ./out (no server runtime).
// - basePath is the repo name for project pages (https://user.github.io/repo),
//   set at build via NEXT_PUBLIC_BASE_PATH; empty for a <user>.github.io repo.
// - trailingSlash: every route becomes a directory with index.html, which
//   GitHub Pages resolves reliably.
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
