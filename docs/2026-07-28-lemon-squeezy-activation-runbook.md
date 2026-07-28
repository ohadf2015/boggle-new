# Lemon Squeezy / Teacher Pro Checkout — Activation Runbook

**Status:** BLOCKED on business action (Lemon Squeezy KYC). Zero engineering left — all code shipped and verified.
**Owner:** Ohad only. **Target:** $0 → $50–150 MRR within 30 days at current scale (47 WAU), compounding with `/education/*` SEO.

## Why this doc exists

The full $9/mo Teacher Pro funnel is built and tracked (pricing page, district upsell strip,
dashboard banner, `iap_viewed` instrumentation), and real traffic already hits it — but checkout
hard-returns 503 until the Lemon Squeezy store is Live. No code change moves this metric; only the
steps below do.

The gate is deliberate (`fe-next/app/api/subscription/checkout/route.ts:20`,
`fe-next/app/[locale]/teacher/upgrade/PageClient.tsx:19`): a user must never reach a checkout that
can't take money.

## What is already done (do not rebuild)

- Checkout API + 503 gate — `app/api/subscription/checkout/route.ts`
- Upgrade page + inert CTA when disabled — `app/[locale]/teacher/upgrade/PageClient.tsx`
- Lemon Squeezy client (checkout create + HMAC webhook verify) — `lib/lemonsqueezy.ts`
- Webhook handler (all 5 events) — `app/api/webhook/lemonsqueezy/route.ts`
- RLS-secured `subscriptions` table + `lib/subscriptions.ts` upsert
- `/api/subscription/status` read path

## Activation steps (ordered, verifiable)

1. **Complete Lemon Squeezy KYC / business verification.** Then flip the store from Test to **Live**.
2. **Create the product + variant:** Teacher Pro, $9/mo recurring. Note the **variant ID**.
3. **Set the 5 production env vars** (Railway → service → Variables):
   - `LEMONSQUEEZY_API_KEY` — a **live** (not test) API key
   - `LEMONSQUEEZY_STORE_ID`
   - `LEMONSQUEEZY_PRO_VARIANT_ID` — from step 2
   - `LEMONSQUEEZY_WEBHOOK_SECRET` — matches the webhook you register in step 4
   - `NEXT_PUBLIC_APP_URL` — e.g. `https://lexiclash.com` (post-checkout redirect target)
4. **Register the webhook** in Lemon Squeezy:
   - URL: `https://<app-host>/api/webhook/lemonsqueezy`
   - Secret: same value as `LEMONSQUEEZY_WEBHOOK_SECRET`
   - Events: `order_created`, `subscription_created`, `subscription_updated`,
     `subscription_cancelled`, `subscription_expired`
5. **Flip the flag AND redeploy:** set `NEXT_PUBLIC_CHECKOUT_ENABLED=true`, then trigger a **rebuild/redeploy**.
   > ⚠️ **Do not skip the rebuild.** `NEXT_PUBLIC_*` vars are inlined into the client bundle at
   > **build time**. The API route (`route.ts:20`) reads the var at runtime, but the upgrade page
   > (`PageClient.tsx:19`) reads the value baked in at build. A runtime-only env poke enables the API
   > while the button stays disabled (stale `false`) — a dual-source-of-truth trap. On Railway an env
   > change normally triggers a rebuild; confirm the deploy actually rebuilt.

## Verify end-to-end (after redeploy)

- [ ] `/teacher/upgrade` — "Upgrade Now" button is enabled (not greyed out).
- [ ] Complete a test/live checkout → redirects back to `/teacher?checkout=success`.
- [ ] Lemon Squeezy webhook log shows the event delivered `200`.
- [ ] `subscriptions` row for that user upserts to `tier=pro`, `status=active`.
- [ ] `GET /api/subscription/status` reflects `pro`.

## Rollback

Set `NEXT_PUBLIC_CHECKOUT_ENABLED` back to `false` (or unset) and redeploy. API returns 503, CTA goes inert.
