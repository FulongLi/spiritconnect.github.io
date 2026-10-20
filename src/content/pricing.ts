/**
 * Presence Hardware pricing and release — the single source of truth.
 *
 * Every price, launch window and outbound product link shown anywhere on the
 * site (Presence page, interior stage, interest submission payload) is read
 * from here. Change a value once and it updates everywhere. The Founding
 * 1,000 campaign (target, state, checkout and terms) lives in
 * `./campaign.ts` and reads its price from here.
 *
 * The site itself never takes payment.
 */
export const PRESENCE_PRICING = {
  currency: "GBP",
  /** Founding 1,000 campaign price per Presence Hardware unit. */
  foundingPrice: 399,
  /** Planned future retail price. */
  plannedRetailPrice: 699,
} as const;

type PresenceRelease = {
  /**
   * Planned release window — always presented as planned and conditional on
   * the Founding 1,000 campaign and production readiness, never guaranteed.
   */
  plannedLaunch: string;
  /**
   * The live online Presence experience (the "Try Presence" CTA).
   * `null` until it is publicly deployed: the CTA then shows an
   * "Online experience coming soon" state instead of a link.
   */
  experienceUrl: string | null;
};

export const PRESENCE_RELEASE: PresenceRelease = {
  plannedLaunch: "Summer 2027",
  experienceUrl: null,
};

export function formatPrice(amount: number, currency: string = PRESENCE_PRICING.currency) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** whole numbers with UK digit grouping: 1000 → "1,000" */
export function formatCount(n: number) {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(n);
}

export const FOUNDING_PRICE_LABEL = formatPrice(PRESENCE_PRICING.foundingPrice);
export const PLANNED_RETAIL_PRICE_LABEL = formatPrice(PRESENCE_PRICING.plannedRetailPrice);
