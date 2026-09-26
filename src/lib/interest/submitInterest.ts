import { PRESENCE_PRICING } from "@/content/pricing";
import type {
  InterestFormValues,
  InterestSubmission,
  InterestTransport,
  SubmitResult,
} from "./types";

/* ------------------------------------------------------------------ */
/* Register Your Interest — submission pipeline                         */
/*                                                                     */
/* The form UI only ever calls `submitInterest(values)`. Where the data */
/* goes is decided here, so a backend can be connected without touching */
/* the UI:                                                              */
/*                                                                     */
/*   NEXT_PUBLIC_INTEREST_ENDPOINT=https://…                            */
/*     → POSTs the JSON payload (InterestSubmission) to that URL.        */
/*       Works with a serverless function, Formspree/Getform-style form  */
/*       services, Supabase/Firebase HTTP functions, etc. Any 2xx        */
/*       response counts as success.                                     */
/*                                                                     */
/*   (unset)                                                            */
/*     → nothing is sent and the UI says registration isn't open yet.    */
/*       Success is never faked.                                        */
/*                                                                     */
/* The site is a static export, so the variable is read at build time:  */
/* set it as a GitHub Actions repository variable                       */
/* (PRESENCE_INTEREST_ENDPOINT — see .github/workflows) or in .env.local */
/* for development. For a custom integration, implement InterestTransport*/
/* and return it from `getInterestTransport`.                           */
/* ------------------------------------------------------------------ */

const ENDPOINT = process.env.NEXT_PUBLIC_INTEREST_ENDPOINT?.trim() || "";

export function httpJsonTransport(endpoint: string): InterestTransport {
  return {
    name: "http-json",
    async submit(submission) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(submission),
        });
        if (res.ok) return { ok: true };
        return { ok: false, reason: "rejected", message: `HTTP ${res.status}` };
      } catch (error) {
        return {
          ok: false,
          reason: "network",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

export const notConfiguredTransport: InterestTransport = {
  name: "not-configured",
  async submit(submission) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        "[interest] NEXT_PUBLIC_INTEREST_ENDPOINT is not set — submission not sent:",
        submission,
      );
    }
    return { ok: false, reason: "not-configured" };
  },
};

export function getInterestTransport(): InterestTransport {
  return ENDPOINT ? httpJsonTransport(ENDPOINT) : notConfiguredTransport;
}

export function isInterestBackendConfigured() {
  return ENDPOINT.length > 0;
}

export function buildSubmission(
  values: InterestFormValues,
  source = "presence-page",
): InterestSubmission {
  return {
    ...values,
    email: values.email.trim(),
    schemaVersion: 1,
    product: "presence",
    programme: "founding-100",
    foundingPrice: PRESENCE_PRICING.foundingPrice,
    currency: PRESENCE_PRICING.currency,
    source,
    submittedAt: new Date().toISOString(),
    locale: typeof navigator !== "undefined" ? navigator.language : undefined,
  };
}

export async function submitInterest(
  values: InterestFormValues,
  transport: InterestTransport = getInterestTransport(),
): Promise<SubmitResult> {
  return transport.submit(buildSubmission(values));
}
