/**
 * Company information, brand architecture and navigation.
 *
 * Spirit Connect is the parent company and master brand. Its divisions are
 * described here once and referenced by the header, the journey, the
 * interior stage and the About page.
 */

export const COMPANY = {
  name: "Spirit Connect",
  legalName: "Spirit Connect Ltd",
  founded: "June 2025",
  domain: "spiritconnect.co.uk",
  url: "https://spiritconnect.co.uk",
  vision: "ENERGY POWERS AI. AI DESIGNS ENERGY.",
  /**
   * Public contact address. Leave null until there is a monitored inbox —
   * when set, the Register Interest form offers it as a fallback while the
   * submission backend is not configured.
   */
  contactEmail: null as string | null,
} as const;

/**
 * Canonical brand assets. Reference the logo and favicons from here only.
 * The logo is a single-colour mark (black); on dark surfaces use it as a
 * CSS mask (see components/site/BrandMark) so it takes the text colour.
 */
export const BRAND = {
  logo: "/assets/SC_black.svg",
  /** adaptive favicon: black mark, white in dark browser themes */
  favicon: "/assets/brand/favicon.svg",
  faviconPng: "/assets/brand/favicon-32.png",
  appleTouchIcon: "/assets/brand/apple-touch-icon.png",
  /** intrinsic proportions of the mark */
  aspect: 44 / 36,
} as const;

/**
 * The self-improving loop at the centre of Spirit Connect.
 * Rendered as the loop diagram on the About page.
 */
export const VISION_LOOP = [
  { id: "energy", label: "Energy system", detail: "Generation, storage and conversion power everything that follows." },
  { id: "compute", label: "Computation & AI", detail: "Energy becomes computation. Computation becomes intelligence." },
  { id: "design", label: "AI designs", detail: "Intelligence understands the energy system — and redesigns it." },
  { id: "improved", label: "Improved system", detail: "Better converters, better grids, better energy systems." },
  { id: "feedback", label: "New data", detail: "Every improved system returns new data, and the loop continues." },
] as const;

export type DivisionId = "presence" | "aipe" | "fantasy";

export type Division = {
  id: DivisionId;
  name: string;
  /** short descriptor shown as an eyebrow */
  role: string;
  summary: string;
  href: string;
  external: boolean;
  /**
   * primary: promoted across the Spirit Connect site
   * division: shown as an independent division with an external entry point
   * archived: kept on record, not shown in navigation or the interior
   */
  visibility: "primary" | "division" | "archived";
};

export const DIVISIONS: Record<DivisionId, Division> = {
  presence: {
    id: "presence",
    name: "Presence",
    role: "Human interface to intelligent systems",
    summary:
      "A visual and voice interface for AI — for conversation, work, engineering and everyday life.",
    href: "/presence",
    external: false,
    visibility: "primary",
  },
  aipe: {
    id: "aipe",
    name: "AIPE",
    role: "Engineering division",
    summary:
      "AI-driven power electronics engineering: the tools, research and workflows that let AI design energy systems — and close the loop.",
    href: "https://aipel.co.uk",
    external: true,
    visibility: "division",
  },
  // Kept harmlessly isolated: Fantasy is not a commercial division at this
  // stage and is not surfaced in navigation. It may return later as a
  // cultural / artistic object inside the interior.
  fantasy: {
    id: "fantasy",
    name: "Spirit Connect Fantasy",
    role: "Art & storytelling",
    summary: "Future imagination, storytelling, digital art and interactive worlds.",
    href: "https://fulongli.github.io/Spirit-Connect-Fantasy/",
    external: true,
    visibility: "archived",
  },
};

export type NavItem = {
  id: string;
  label: string;
  href: string;
  external?: boolean;
};

export const MAIN_NAV: NavItem[] = [
  { id: "vision", label: "Vision", href: "/" },
  { id: "presence", label: "Presence", href: DIVISIONS.presence.href },
  { id: "aipe", label: "AIPE", href: DIVISIONS.aipe.href, external: true },
  { id: "about", label: "About", href: "/about" },
];
