# Register Your Interest — backend integration

The Founding 100 form on `/presence` is market validation only: it takes no
payment and never reports success unless a backend accepted the submission.

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

## Payload (`InterestSubmission`, `schemaVersion: 1`)

```json
{
  "email": "person@example.com",
  "interestLevel": "just-following | interested | very-interested | would-consider-buying",
  "primaryUse": "ai-conversation | work-productivity | engineering | smart-home-ambient | entertainment | other",
  "purchaseIntent": "yes | maybe | not-yet",
  "consent": true,
  "schemaVersion": 1,
  "product": "presence",
  "programme": "founding-100",
  "foundingPrice": 399,
  "currency": "GBP",
  "source": "presence-page",
  "submittedAt": "2026-09-26T14:50:22.116Z",
  "locale": "en-GB"
}
```

`foundingPrice` / `currency` come from `src/content/pricing.ts`, so the
answer to "would you buy at £399?" is always stored with the price shown.

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
