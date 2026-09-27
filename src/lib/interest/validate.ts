import type { InterestFormValues } from "./types";

export type InterestDraft = {
  [K in keyof InterestFormValues]: InterestFormValues[K] | "" | false;
};

export type InterestErrors = Partial<Record<keyof InterestFormValues, string>>;

// deliberately permissive — the backend should do the authoritative check
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateInterest(draft: InterestDraft): {
  values: InterestFormValues | null;
  errors: InterestErrors;
} {
  const errors: InterestErrors = {};
  const email = typeof draft.email === "string" ? draft.email.trim() : "";
  if (!email) errors.email = "Please enter your email address.";
  else if (!EMAIL_RE.test(email)) errors.email = "Please enter a valid email address.";
  if (!draft.interestLevel) errors.interestLevel = "Please choose one.";
  if (!draft.primaryUse) errors.primaryUse = "Please choose one.";
  if (!draft.consent) errors.consent = "Please confirm so we can contact you.";

  if (Object.keys(errors).length > 0) return { values: null, errors };
  return { values: { ...(draft as InterestFormValues), email }, errors };
}
