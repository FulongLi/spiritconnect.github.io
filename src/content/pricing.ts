/**
 * Presence Founding 100 pre-order pricing and release — the single source of
 * truth.
 *
 * Every price, launch window and outbound product link shown anywhere on the
 * site (Presence page, interior stage, interest submission payload) is read
 * from here. Change a value once and it updates everywhere.
 *
 * The site itself never takes payment: pre-orders happen at an external
 * checkout, linked from `PRESENCE_RELEASE.preorderUrl`.
 */
export const PRESENCE_PRICING = {
  currency: "GBP",
  /** Founding 100 pre-order price for the first production units. */
  foundingPrice: 399,
  /** Planned future retail price. */
  plannedRetailPrice: 699,
  /** Number of units in the Founding 100 allocation. */
  foundingAllocation: 100,
} as const;

type PresenceRelease = {
  /** Planned launch window — always presented as planned, never guaranteed. */
  plannedLaunch: string;
  /**
   * The live online Presence experience (the "Try Presence" CTA).
   * `null` until it is publicly deployed: the CTA then shows an
   * "Online experience coming soon" state instead of a link.
   */
  experienceUrl: string | null;
  /**
   * The external pre-order checkout / reservation page (the "Pre-order
   * Presence" CTAs). `null` until the provider is live: the CTAs then show a
   * "Pre-order opening soon" state. Set an absolute https URL to activate them.
   */
  preorderUrl: string | null;
};

export const PRESENCE_RELEASE: PresenceRelease = {
  plannedLaunch: "Summer 2027",
  experienceUrl: null,
  preorderUrl: null,
};

export function formatPrice(amount: number, currency: string = PRESENCE_PRICING.currency) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export const FOUNDING_PRICE_LABEL = formatPrice(PRESENCE_PRICING.foundingPrice);
export const PLANNED_RETAIL_PRICE_LABEL = formatPrice(PRESENCE_PRICING.plannedRetailPrice);
