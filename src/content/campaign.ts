import {
  FOUNDING_PRICE_LABEL,
  PLANNED_RETAIL_PRICE_LABEL,
  PRESENCE_PRICING,
  PRESENCE_RELEASE,
  formatCount,
  formatPrice,
} from "./pricing";

/* ------------------------------------------------------------------ */
/* Founding 1,000 — the conditional Presence Hardware launch campaign   */
/*                                                                     */
/* The goal is 1,000 genuine, qualifying purchase commitments at the    */
/* founding price. If the campaign reaches them, Spirit Connect intends */
/* to move forward with the initial production programme. It is not a   */
/* first-N-units discount, and registering interest is not a commitment.*/
/*                                                                     */
/* Every campaign value shown on the site is read from here. Nothing    */
/* here simulates a checkout: the "Back Presence" CTA stays in its      */
/* "Campaign opening soon" state until `isBackingOpen()` is true, which */
/* requires a live checkout URL AND the customer-facing terms below.    */
/* ------------------------------------------------------------------ */

/**
 * How a backer commits. Deliberately left undecided (`null`) — choosing it
 * is a commercial and legal decision, not a website default:
 *
 * - "charge-if-funded": all-or-nothing — the customer is charged only if
 *   the target is reached by the deadline. Check how long the payment
 *   provider can hold an authorisation; most cannot hold one indefinitely.
 * - "refundable-deposit": a deposit now, the balance later; the deposit is
 *   refunded under the published refund policy.
 * - "charge-now-refund-if-unfunded": charged immediately and refunded in
 *   full if the target is not reached by the deadline.
 */
export type CommitmentModel = "charge-if-funded" | "refundable-deposit" | "charge-now-refund-if-unfunded";

/**
 * - pre-launch: the campaign is announced; no commitments can be made yet
 * - open: commitments are being taken through the approved checkout
 * - target-reached: the threshold has been met (set only from authoritative data)
 * - closed: the campaign has ended
 */
export type CampaignPhase = "pre-launch" | "open" | "target-reached" | "closed";

/**
 * What a customer must be told before any payment is taken. All of these
 * must be set (and published at `termsUrl`) before the checkout goes live.
 */
export type CampaignTerms = {
  commitmentModel: CommitmentModel | null;
  /** campaign deadline, ISO 8601 date (e.g. "2027-03-31"); never invented */
  deadline: string | null;
  /** full campaign terms: charging, refunds, cancellation, fulfilment, UK consumer rights */
  termsUrl: string | null;
  /** customer support contact for backers (email address or https URL) */
  supportContact: string | null;
};

export type FoundingCampaign = {
  id: "founding-1000";
  name: string;
  /** qualifying commitments needed before production goes ahead */
  target: number;
  phase: CampaignPhase;
  /** the external campaign checkout (absolute https URL); `null` until it is live */
  checkoutUrl: string | null;
  terms: CampaignTerms;
};

export const FOUNDING_CAMPAIGN: FoundingCampaign = {
  id: "founding-1000",
  name: "Founding 1,000",
  target: 1000,
  phase: "pre-launch",
  checkoutUrl: null,
  terms: {
    commitmentModel: null,
    deadline: null,
    termsUrl: null,
    supportContact: null,
  },
};

/**
 * True only when backers can genuinely commit: the campaign is open, the
 * checkout URL is set, and every customer-facing term is in place.
 */
export function isBackingOpen(campaign: FoundingCampaign = FOUNDING_CAMPAIGN) {
  const { terms } = campaign;
  return (
    campaign.phase === "open" &&
    !!campaign.checkoutUrl?.trim().startsWith("https://") &&
    terms.commitmentModel !== null &&
    !!terms.deadline &&
    !!terms.termsUrl &&
    !!terms.supportContact
  );
}

/** the checkout destination for the "Back Presence" CTAs, or null while it isn't open */
export function backingUrl(campaign: FoundingCampaign = FOUNDING_CAMPAIGN) {
  return isBackingOpen(campaign) ? campaign.checkoutUrl!.trim() : null;
}

/** Display values derived from the configuration above — never typed by hand. */
export const CAMPAIGN_FIGURES = {
  target: FOUNDING_CAMPAIGN.target,
  targetLabel: formatCount(FOUNDING_CAMPAIGN.target),
  priceLabel: FOUNDING_PRICE_LABEL,
  plannedRetailLabel: PLANNED_RETAIL_PRICE_LABEL,
  plannedLaunch: PRESENCE_RELEASE.plannedLaunch,
  /**
   * Gross value of the target number of orders, before payment fees, tax,
   * fulfilment, manufacturing and other costs. Not a production budget and
   * not net revenue.
   */
  grossTargetLabel: formatPrice(FOUNDING_CAMPAIGN.target * PRESENCE_PRICING.foundingPrice),
} as const;
