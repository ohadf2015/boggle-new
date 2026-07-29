# Remove-Ads via Google Play Billing — Spec

**Date:** 2026-06-08
**Status:** Server-verify half BUILT (this branch). Native client half + Play Console product =
owner/device action (below). Ships dark (503) until the service-account env is set.

## Why Play Billing
Stripe is unavailable; remove-ads-for-coins was rejected (revenue-negative). Google Play
Billing is the real-money path we *can* use — there's a published Android app
(`live.lexiclash.app`) and a working Play service account
(`~/.config/play-console-sa.json`, full Play Console perms). This grants the
`profiles.ads_removed` entitlement built in `docs/2026-06-08-remove-ads-entitlement-spec.md`.

## Architecture
1. **Native (Android, device-gated — NOT built here):** user taps "Remove Ads" → a Capacitor
   billing plugin launches the Play purchase sheet for the managed product `remove_ads` →
   returns a `purchaseToken`.
2. **Server verify (BUILT, testable):** client POSTs `{ purchaseToken, productId }` to
   `/api/purchases/remove-ads/play`. The server NEVER trusts the client — it verifies the token
   against the Google Play Developer API
   (`androidpublisher.../purchases/products/{productId}/tokens/{token}`) using an OAuth token
   minted from the service account, checks `purchaseState === 0` (purchased), then calls the
   idempotent `grant_remove_ads(p_transaction_id='play_<orderId>', p_provider='google_play')`.
   The verified `orderId` is the dedup key.

## What shipped here (verifiable server half), TDD
- `lib/purchases/playBillingVerify.ts`: `parsePlayPurchase` (pure), `verifyPlayPurchase`
  (mockable fetch), `getPlayAccessToken` (SA JWT→OAuth, isolated), `isPlayBillingConfigured`.
- `app/api/purchases/remove-ads/play/route.ts`: authed POST → verify → grant. Dark (503) until
  configured. 401 unauth / 400 invalid purchase / 200 grant|dedup / 500 transient.

## Owner / device checklist (to go live)
1. **Play Console:** create an in-app **managed product** id `remove_ads` (one-time), set price,
   activate.
2. **Native plugin:** add a Capacitor billing plugin (e.g. `@capacitor-community/in-app-purchases`
   or RevenueCat), wire the purchase flow + `purchaseToken` → POST to the server route. Device
   build required (peer-dep/gradle risk like the PGS bridge — unverifiable in this env).
3. **Server env (prod):** `GOOGLE_PLAY_SA_CLIENT_EMAIL`, `GOOGLE_PLAY_SA_PRIVATE_KEY`
   (from the SA json), `GOOGLE_PLAY_PACKAGE_NAME=live.lexiclash.app`. Until set, the route 503s.
4. **Acknowledge:** Play requires acknowledging the purchase within 3 days or it auto-refunds —
   acknowledge client-side on success OR server-side after grant (`purchases.products.acknowledge`).
   (Follow-up; the verify+grant is the security core.)
5. **Test:** sandbox/license-tester purchase on a signed build → confirm `ads_removed` flips +
   banner/interstitial vanish + rewarded still plays.

## Caveats
- The **native purchase flow is unverifiable in this session** (no device). Only the server
  verify+grant is tested here (mocked Google API).
- `getPlayAccessToken` (SA JWT signing) is real but exercised only with real creds; unit tests
  cover the pure parse + the verify-with-mocked-fetch + route guards.
