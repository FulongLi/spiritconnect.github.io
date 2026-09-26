import type { Metadata, Viewport } from "next";
import "./globals.css";
import { COMPANY } from "@/content/site";

export const metadata: Metadata = {
  metadataBase: new URL(COMPANY.url),
  title: {
    default: "Spirit Connect — Energy powers AI. AI designs energy.",
    template: "%s | Spirit Connect",
  },
  description:
    "Energy powers AI. AI designs energy. A journey across a lunar micro-grid into the Spirit Connect interior — home of Presence, AI with a presence — with AIPE, the Spirit Connect engineering division.",
  icons: {
    icon: "/assets/spirit-connect-logo.svg",
    shortcut: "/assets/spirit-connect-logo.svg",
    apple: "/assets/spirit-connect-logo.png",
  },
  openGraph: {
    siteName: COMPANY.name,
    type: "website",
    locale: "en_GB",
  },
};

export const viewport: Viewport = {
  themeColor: "#030509",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
