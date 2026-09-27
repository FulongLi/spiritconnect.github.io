# Register Your Interest — backend integration

The Register Interest form on `/presence` is the Presence update list ("I like
Presence, keep me updated"). It asks nothing about buying — purchasing is the
separate pre-order path (see below) — takes no payment, and never reports
success unless a backend accepted the submission.

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

## Payload (`InterestSubmission`, `schemaVersion: 2`)

```json
{
  "email": "person@example.com",
  "interestLevel": "just-following | interested | very-interested",
  "primaryUse": "ai-conversation | work-productivity | engineering | smart-home-ambient | entertainment | other",
  "consent": true,
  "schemaVersion": 2,
  "product": "presence",
  "programme": "founding-100",
  "foundingPrice": 399,
  "currency": "GBP",
  "source": "presence-page",
  "submittedAt": "2026-09-26T14:50:22.116Z",
  "locale": "en-GB"
}
```

`foundingPrice` / `currency` come from `src/content/pricing.ts` and record the
Founding 100 price shown on the page at sign-up.

v2 removed `purchaseIntent` and the `would-consider-buying` interest level
(v1). A backend that stored v1 records should accept both versions.

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

## Pre-order and Try Presence links

Neither is handled by this site. Both CTAs read one value each in
`src/content/pricing.ts → PRESENCE_RELEASE`:

| Field | CTA | While `null` |
| --- | --- | --- |
| `preorderUrl` | "Pre-order Presence" (Founding 100 + bottom of the page) | "Pre-order opening soon" — an unavailable control, no link |
| `experienceUrl` | "Try Presence" (under the demo) | "Online experience coming soon" — an unavailable control, no link |

Set an absolute `https://…` URL (the external checkout / reservation page, or
the deployed online experience) and rebuild; the CTAs become ordinary links.
No order is recorded or confirmed on this site.
