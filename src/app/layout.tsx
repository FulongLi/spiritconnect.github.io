import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BRAND, COMPANY } from "@/content/site";
import { barlowCondensed, bebasNeue, ibmPlexMono } from "@/components/shared/fonts";

export const metadata: Metadata = {
  metadataBase: new URL(COMPANY.url),
  title: {
    default: "Spirit Connect — No matter where you are, you are always connected.",
    template: "%s | Spirit Connect",
  },
  description:
    "No matter where you are, you are always connected. Spirit Connect connects people, intelligence, technology and the physical world — a journey across a lunar micro-grid into the Spirit Connect interior, home of Presence, AI with a presence, and AIPE, intelligent engineering for energy and power systems.",
  icons: {
    icon: [
      { url: BRAND.favicon, type: "image/svg+xml" },
      { url: BRAND.faviconPng, type: "image/png", sizes: "32x32" },
    ],
    shortcut: BRAND.faviconPng,
    apple: BRAND.appleTouchIcon,
  },
  openGraph: {
    siteName: COMPANY.name,
    type: "website",
    locale: "en_GB",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // the next/font classes define --font-bebas / --font-barlow / --font-ibm-mono;
  // on <html> so the :root type roles in globals.css resolve to them
  const fontVariables = `${bebasNeue.variable} ${barlowCondensed.variable} ${ibmPlexMono.variable}`;
  return (
    <html lang="en-GB" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
