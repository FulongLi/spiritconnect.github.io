# Register Your Interest — backend integration

The Register Interest form on `/presence` is the Presence update list ("I like
Presence, keep me updated"). It is free and non-binding: it asks nothing about
buying — backing the Founding 1,000 campaign is the separate checkout path (see
below) — takes no payment, reserves nothing, and never reports success unless a
backend accepted the submission.

**A registration is never a campaign commitment.** It must not be counted
toward the Founding 1,000 target, and the site never says it does.

## How it works

```
InterestForm (UI)  →  submitInterest(values)  →  InterestTransport  →  your backend
src/components/presence/InterestForm.tsx
                      src/lib/interest/submitInterest.ts
                                                  src/lib/interest/types.ts
```

The UI only calls `submitInterest`. The transport is chosen from one
build-time variable:

| `NEXT_PUBLIC_INTEREST_ENDPOINT` | Result |
| --- | --- |
| unset (today) | nothing is sent; the form says registration opens soon |
| an `https://…` URL | the payload is `POST`ed as JSON; any 2xx = success |

## Payload (`InterestSubmission`, `schemaVersion: 3`)

```json
{
  "email": "person@example.com",
  "interestLevel": "just-following | interested | very-interested",
  "primaryUse": "ai-conversation | work-productivity | engineering | smart-home-ambient | entertainment | other",
  "consent": true,
  "schemaVersion": 3,
  "product": "presence",
  "programme": "founding-1000",
  "registration": "interest-only",
  "foundingPrice": 399,
  "currency": "GBP",
  "source": "presence-page",
  "submittedAt": "2026-09-26T14:50:22.116Z",
  "locale": "en-GB"
}
```

`foundingPrice` / `currency` come from `src/content/pricing.ts` and record the
Founding 1,000 price shown on the page at sign-up. `registration:
"interest-only"` states what the record is: updates only — no purchase, no
reservation, not counted toward the campaign target.

### Versions

| `schemaVersion` | `programme` | Meaning |
| --- | --- | --- |
| 1 | `founding-100` | update list + a `purchaseIntent` answer and the `would-consider-buying` level |
| 2 | `founding-100` | update list only, given under the Founding 100 copy and consent wording |
| 3 | `founding-1000` | update list only, given under the Founding 1,000 copy and consent wording; adds `registration` |

A backend should accept all three and keep `schemaVersion` / `programme` with
each record: they tell you which wording the person consented to. Don't
rewrite older records as `founding-1000` — v1/v2 sign-ups agreed to emails
about the Founding 100, not the Founding 1,000 campaign.

## Connecting a backend

The site is a static export, so the endpoint is baked in at build time.

1. Create an endpoint that accepts the JSON above — e.g. a Cloudflare Worker /
   Vercel or Netlify function writing to a database or mailing list, a
   Supabase Edge Function, or a form service that accepts JSON posts.
   It must allow CORS `POST` from `https://spiritconnect.co.uk`.
2. In GitHub: **Settings → Secrets and variables → Actions → Variables**, add
   `PRESENCE_INTEREST_ENDPOINT` with the URL. The deploy workflow passes it
   to the build as `NEXT_PUBLIC_INTEREST_ENDPOINT`.
3. Push / re-run the deploy. For local testing put the same variable in
   `.env.local`.

Validate and de-duplicate on the server (the client check is deliberately
permissive) and keep the consent flag with each record. Spam bots that fill
the hidden `company` field are dropped client-side.

For a non-HTTP integration, implement `InterestTransport` and return it from
`getInterestTransport()` — the UI does not change.

## Back Presence (Founding 1,000) and Try Presence links

Neither is handled by this site.

| Setting | CTA | While not set |
| --- | --- | --- |
| `src/content/campaign.ts → FOUNDING_CAMPAIGN` | "Back Presence — £399" (Founding 1,000 section) and "Back Presence" (bottom of the page) | "Campaign opening soon" — an unavailable control, no link |
| `src/content/pricing.ts → PRESENCE_RELEASE.experienceUrl` | "Try Presence" (under the demo) | "Online experience coming soon" — an unavailable control, no link |

The Back Presence CTAs only become links when `isBackingOpen()` is true:
`phase: "open"`, an `https://` `checkoutUrl`, **and** every customer-facing
term — `commitmentModel`, `deadline`, `termsUrl`, `supportContact`. The site
deliberately does not choose a payment model; that is a commercial / legal
decision (see the `CommitmentModel` comments in `campaign.ts`).

No order, payment or reservation is recorded or confirmed on this site.

## Campaign progress

`src/lib/campaign/progress.ts` defines the progress source. While the campaign
is in `pre-launch` nothing is read and the page shows the target with an
explanatory state — never a count. Once the phase changes, the browser reads
`NEXT_PUBLIC_CAMPAIGN_PROGRESS_ENDPOINT` (build-time variable), which must
return:

```json
{ "campaign": "founding-1000", "confirmedCommitments": 0, "asOf": "2027-01-01T12:00:00Z" }
```

Only qualifying, confirmed commitments made through the approved checkout
count. Interest registrations, test-mode payments, failed or abandoned
payments, cancellations and refunds do not. The number must come from the
payment / campaign provider (e.g. a webhook-maintained counter), never from
this site. If the endpoint fails or returns anything invalid, the page says
progress is unavailable rather than guessing.
