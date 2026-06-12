import type { Metadata } from "next";
import "./globals.css";
import Footer from "@/components/overlay/components/Footer/Footer";


export const metadata: Metadata = {
  title: "Spirit Connect",
  description:
    "Energy powers AI. AI designs energy. A journey across a lunar micro-grid — solar field, energy storage, solid-state transformer, data centre, and nuclear core — leading into the Spirit Connect ecosystem: AIPE Labs, AI Labs, and Fantasy.",
  icons: {
    icon: "/assets/spirit-connect-logo.svg",
    shortcut: "/assets/spirit-connect-logo.svg",
    apple: "/assets/spirit-connect-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Footer />
      </body>
    </html>
  );
}
