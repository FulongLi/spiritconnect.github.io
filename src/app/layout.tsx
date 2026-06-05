import type { Metadata } from "next";
import "./globals.css";
import Footer from "@/components/overlay/components/Footer/Footer";


export const metadata: Metadata = {
  title: "Spirit Connect",
  description:
    "A holographic brand portal connecting Spirit Connect AIPE Labs, Spirit Connect, AI Labs, Fantasy, and Art.",
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
