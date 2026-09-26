import type { INTEREST_LEVELS, PRIMARY_USES, PURCHASE_INTENTS } from "@/content/presence";

export type InterestLevel = (typeof INTEREST_LEVELS)[number]["value"];
export type PrimaryUse = (typeof PRIMARY_USES)[number]["value"];
export type PurchaseIntent = (typeof PURCHASE_INTENTS)[number]["value"];

/** What the visitor fills in. */
export type InterestFormValues = {
  email: string;
  interestLevel: InterestLevel;
  primaryUse: PrimaryUse;
  purchaseIntent: PurchaseIntent;
  consent: boolean;
};

/**
 * The payload sent to the backend. Versioned so a future schema change can
 * be handled server-side without breaking older clients.
 */
export type InterestSubmission = InterestFormValues & {
  schemaVersion: 1;
  product: "presence";
  programme: "founding-100";
  /** founding price the visitor was shown, in whole currency units */
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
