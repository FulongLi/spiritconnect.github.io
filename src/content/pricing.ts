/**
 * Presence Founding 100 pricing — the single source of truth.
 *
 * Every price shown anywhere on the site (Presence page, interior stage,
 * interest form question, submission payload) is read from here. Change a
 * number once and it updates everywhere.
 *
 * This is market-validation pricing, not a checkout: no payment is taken.
 */
export const PRESENCE_PRICING = {
  currency: "GBP",
  /** Planned price for the first units, offered to early supporters. */
  foundingPrice: 399,
  /** Planned future retail price. */
  plannedRetailPrice: 699,
  /** Number of units in the founding programme. */
  foundingAllocation: 100,
} as const;

export function formatPrice(amount: number, currency: string = PRESENCE_PRICING.currency) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export const FOUNDING_PRICE_LABEL = formatPrice(PRESENCE_PRICING.foundingPrice);
export const PLANNED_RETAIL_PRICE_LABEL = formatPrice(PRESENCE_PRICING.plannedRetailPrice);
