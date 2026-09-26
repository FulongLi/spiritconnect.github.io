import type { Metadata } from "next";
import LegacyRedirect from "@/components/site/LegacyRedirect";
import { DIVISIONS } from "@/content/site";

/**
 * The retired four-branch portal published pages at /branches/<id>.
 * They are kept as static redirects so existing links keep working.
 */
const LEGACY_BRANCHES: Record<string, { href: string; label: string }> = {
  "spirit-connect": { href: "/about", label: "About Spirit Connect" },
  "power-labs": { href: DIVISIONS.aipe.href, label: "AIPE" },
  ai: { href: DIVISIONS.presence.href, label: "Presence" },
  gaming: { href: DIVISIONS.fantasy.href, label: "Spirit Connect Fantasy" },
};

export function generateStaticParams() {
  return Object.keys(LEGACY_BRANCHES).map((id) => ({ id }));
}

export const dynamicParams = false;

export const metadata: Metadata = {
  title: "Moved",
  robots: { index: false, follow: true },
};

export default async function LegacyBranchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const target = LEGACY_BRANCHES[id] ?? { href: "/", label: "Spirit Connect" };
  return <LegacyRedirect href={target.href} label={target.label} />;
}
