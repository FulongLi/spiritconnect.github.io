import type { INTEREST_LEVELS, PRIMARY_USES } from "@/content/presence";

export type InterestLevel = (typeof INTEREST_LEVELS)[number]["value"];
export type PrimaryUse = (typeof PRIMARY_USES)[number]["value"];

/** What the visitor fills in. */
export type InterestFormValues = {
  email: string;
  interestLevel: InterestLevel;
  primaryUse: PrimaryUse;
  consent: boolean;
};

/**
 * The payload sent to the backend. Versioned so a future schema change can
 * be handled server-side without breaking older clients.
 *
 * v2: the update list only — purchase intent moved to the separate pre-order
 * path, so `purchaseIntent` and the "would-consider-buying" level were removed.
 * v2 records carry `programme: "founding-100"`: they were given under the
 * Founding 100 copy and consent wording, and keep that meaning.
 *
 * v3: the Founding 1,000 campaign. `programme` is "founding-1000" and
 * `registration` states explicitly that the record is a non-binding interest
 * registration — it is never a purchase commitment and must not be counted
 * toward the campaign target.
 */
export type InterestSubmission = InterestFormValues & {
  schemaVersion: 3;
  product: "presence";
  programme: "founding-1000";
  /** what this record is: updates only, no purchase, no reservation */
  registration: "interest-only";
  /** Founding 1,000 price shown on the page at sign-up, in whole currency units */
  foundingPrice: number;
  currency: string;
  source: string;
  submittedAt: string;
  locale?: string;
};

export type SubmitResult =
  | { ok: true }
  | { ok: false; reason: "not-configured" | "network" | "rejected"; message?: string };

/** Anything that can deliver a submission: an HTTP endpoint, a form service, a test double. */
export interface InterestTransport {
  readonly name: string;
  submit(submission: InterestSubmission): Promise<SubmitResult>;
}
