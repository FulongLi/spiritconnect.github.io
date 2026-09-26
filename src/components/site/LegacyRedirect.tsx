"use client";

import { useEffect } from "react";
import { assetPath } from "@/components/shared/assetPath";

/** Static-hosting redirect: meta refresh + client replace + a visible link. */
export default function LegacyRedirect({ href, label }: { href: string; label: string }) {
  const url = href.startsWith("/") ? assetPath(href) : href;

  useEffect(() => {
    window.location.replace(url);
  }, [url]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#030509",
        color: "rgba(240, 246, 255, 0.8)",
        fontFamily: "var(--font-ibm-mono), monospace",
        fontSize: 11,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        textAlign: "center",
      }}
    >
      <meta httpEquiv="refresh" content={`0; url=${url}`} />
      <p>
        This page has moved to <a href={url} style={{ color: "#9efcff" }}>{label}</a>.
      </p>
    </main>
  );
}
