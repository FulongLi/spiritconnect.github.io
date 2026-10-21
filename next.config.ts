import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const basePath = process.env.NEXT_PUBLIC_SITE_BASE_PATH || "";

export default function nextConfig(phase: string): NextConfig {
  return {
    output: "export",
    basePath,
    assetPrefix: basePath,
    // `page.dev.tsx` routes (asset capture tools) exist only under `next dev`;
    // a production build sees them as plain modules, so they are never exported
    pageExtensions: phase === PHASE_DEVELOPMENT_SERVER ? ["dev.tsx", "tsx", "ts", "jsx", "js"] : ["tsx", "ts", "jsx", "js"],
    images: {
      unoptimized: true,
    },
    env: {
      NEXT_PUBLIC_BASE_PATH: basePath,
    },
  };
}
