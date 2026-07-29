# Web Monetization — ayeT-Studios Offerwall (secure S2S) Spec

**Date:** 2026-06-05
**Status:** Dark / env-gated. Unit-tested rails. NOT executed against a live ayeT account.
**Builds on:** `docs/2026-06-04-web-ad-provider-after-adsense-rejection.md`, the dark `lib/ads/ayetVideoAds.ts` rewarded-video adapter, and `.claude/rules/50-supabase-perf.md`.

## Why this, why now

AdSense rejected `lexiclash.live` twice. Web has zero working ads today (rewarded-video
adapters for ayeT / GameDistribution / H5 all coded but dark). Two AI councils
(gemini-3-flash, grok-4.20) + web research converged on a sequence:

1. Rewarded video (ayeT) — code exists, owner just needs a live placement.
2. Coin-pack IAP via a Merchant-of-Record that allows virtual currency (Polar or
   Lemon Squeezy; **Paddle restricts "stored value", Dodo bans games** — both out).
3. **Offerwall (pay-per-action) — this spec.** Higher revenue *per conversion* than a
   video view, and it maps 1:1 onto the existing coin economy.
4. Display ads — last; do NOT ship before ~100k sessions/mo (UX/LCP cost ≫ RPM).

**Build-target tiebreaker:** every web revenue surface ships *dark* (the owner must
create accounts / set secrets — not codeable here). So the target is chosen for
*least speculation + most ready-to-flip*, not hypothetical ROI. The ayeT offerwall wins:
its provider is **already decided** (so the webhook signature scheme is known, not
guessed across 4 IAP providers), it **reuses the same ayeT account the owner needs for
rewarded video anyway**, and the coin-grant infra + external-id pattern already exist.

## ayeT offerwall S2S postback — confirmed spec (official docs)

- **Method:** GET to a publisher-configured callback URL with macros expanded.
- **Params** (we request these macros): `transaction_id`, `external_identifier`,
  `amount` (virtual currency), `payout_usd`, `is_chargeback` (0|1), `chargeback_reason`,
  `offer_id`, `offer_name`, `currency_identifier`.
- **Signature (optional, we REQUIRE it):** HMAC-SHA256 in header
  `X-Ayetstudios-Security-Hash`. Formula: take all GET params, **sort keys
  alphabetically**, URL-encode each value (space → `+`), join `k=v&...`, then
  `HMAC_SHA256(querystring, PUBLISHER_API_KEY)` hex. Compare constant-time to header.
- **Idempotency key:** `transaction_id`. Reversals arrive with `r-`-prefixed id and/or
  `is_chargeback=1` and negative `payout_usd`.
- **Ack:** return HTTP 200 (empty body fine). Non-200 → ayeT retries 12× over 1h.
- **No public source-IP allowlist** (owner can request from ayeT support; optional defense).

## Architecture

### 1. Migration `supabase/migrations/20260605xxxxxx_offerwall_postbacks.sql`
- Table `public.offerwall_postbacks`:
  - `transaction_id TEXT PRIMARY KEY` (idempotency gate)
  - `network TEXT NOT NULL DEFAULT 'ayet'`
  - `user_id UUID` (the `external_identifier`), `currency_amount INTEGER`,
    `payout_usd NUMERIC(12,4)`, `is_chargeback BOOLEAN`, `offer_id TEXT`,
    `offer_name TEXT`, `raw JSONB`, `created_at TIMESTAMPTZ DEFAULT now()`.
  - **NOT** added to `supabase_realtime` (no consumer — per `50-supabase-perf.md`).
- RPC `public.grant_offerwall_coins(p_transaction_id, p_user_id, p_amount, p_payout_usd,
  p_is_chargeback, p_offer_id, p_offer_name, p_network, p_raw)`:
  - `INSERT INTO offerwall_postbacks ... ON CONFLICT (transaction_id) DO NOTHING`.
    If `NOT FOUND` (conflict) → return `(success=true, deduped=true, new_balance=current)`
    — already processed, idempotent no-op.
  - Else `SELECT ... FOR UPDATE` the profile, apply delta:
    - conversion (`is_chargeback=false`, `p_amount>0`): `total_coins += p_amount`,
      `lifetime_coins_earned += p_amount`.
    - chargeback (`is_chargeback=true` or `p_amount<0`): `total_coins = GREATEST(0,
      total_coins - |p_amount|)`; do not reduce lifetime below 0.
  - Returns `TABLE(success BOOLEAN, deduped BOOLEAN, new_balance INTEGER, error_message TEXT)`.
  - `SECURITY DEFINER`, `SET search_path = public`. Models `award_ad_coins`.
  - **No daily cap** — each postback is a network-verified conversion; the unique
    `transaction_id` is the only gate.

### 2. Pure lib `lib/ads/ayetOfferwallPostback.ts` (security core — heaviest TDD)
- `canonicalQueryString(params: Record<string,string>): string` — sort + url-encode.
- `computeAyetSignature(params, secret): string` — HMAC-SHA256 hex (Node `crypto`).
- `verifyAyetSignature(params, headerHash, secret): boolean` — constant-time compare
  (`crypto.timingSafeEqual`), false on length mismatch / missing.
- `parseAyetPostback(searchParams): AyetPostback | { error }` — validate required fields
  (`transaction_id`, `external_identifier`), coerce `amount`/`payout_usd` numeric,
  derive `isChargeback` from `is_chargeback==='1'` OR `payout_usd<0` OR `r-` prefix.

### 3. Route `app/api/offerwall/ayet/route.ts` (GET)
Order (advisor rule): **verify signature → parse → service-role RPC (dedupe+grant) → 200**.
- Read `AYET_POSTBACK_SECRET` (server env). If unset → 503 (dark; ayeT not configured).
- `verifyAyetSignature` fails → 403 (no credit, no retry-credit of forgeries).
- `parseAyetPostback` fails → 400.
- Service-role Supabase client (NOT session `createClient`) → `grant_offerwall_coins`.
- Always 200 on a handled postback (incl. deduped) so ayeT stops retrying.
- PostHog server event `offerwall_conversion` (amount, payout_usd, is_chargeback, deduped).
- Sentry on RPC/internal error → 500 (let ayeT retry a transient failure).

### 4. Client config `lib/ads/ayetOfferwall.ts`
- Env: `NEXT_PUBLIC_AYET_OFFERWALL_ENABLED='true'` + `NEXT_PUBLIC_AYET_OFFERWALL_ADSLOT`.
  `?ayet_ow_test=1` / `window.__ayetOfferwallTest` dev override (mirrors video adapter).
- Web+auth gate: NOT native (`!Capacitor.isNativePlatform()`), NOT CrazyGames, **user
  must be authed** (offerwall is auth-only — `external_identifier = supabase user.id`).
- `getAyetOfferwallUrl(userId, locale)` → `https://www.ayetstudios.com/offers/web_offerwall/<ADSLOT>?external_identifier=<userId>&...`.
  `userId` is the authed Supabase id — the webhook credits this account.

### 5. UI `components/ads/EarnCoinsOfferwall.tsx`
- Modal with the offerwall in an `<iframe>`. Wrap container `dir="ltr"` even under RTL
  (offerwall grid breaks in RTL — research tip). Auth-gated; hidden if not available.
- Coins are **never** credited client-side — they arrive via the webhook. On modal close,
  refetch balance (`CoinContext` refresh) so the user sees the credit.
- Entry CTA "Earn free coins" beside the rewarded-ad CTA (e.g. `ProfileCoinsSection` /
  earn-coins surface). Hidden when offerwall not configured.

### 6. i18n ×5 (en, he, sv, ja, es) — native, not calqued. Keys under `offerwall.*`.

## Security invariants (must hold)
1. Coins credited **only** by the webhook RPC — never the client iframe callback.
2. Signature verified **before** any DB work.
3. `transaction_id` UNIQUE insert is the idempotency gate; dedupe + grant atomic.
4. Service-role key used only server-side in the webhook; never shipped to client.
5. Offerwall opens only for authed users (`external_identifier = user.id`).

## Out of scope (documented, not built)
- Coin-pack IAP via MoR (council #1-2; separate spec — owner picks Polar/Lemon Squeezy).
- Torox second offerwall (only if ayeT underperforms after 30d).
- Source-IP allowlist (owner must request IPs from ayeT).

## OWNER FLIP-LIVE CHECKLIST (where the real near-term value lands)
1. Create ayeT-Studios publisher account; add `lexiclash.live` web property.
2. Create a **web offerwall** adslot; copy its adslot id.
3. In ayeT dashboard → configure the **S2S callback URL** to
   `https://www.lexiclash.live/api/offerwall/ayet` with macros:
   `?transaction_id={transaction_id}&external_identifier={external_identifier}&amount={currency_amount}&payout_usd={payout_usd}&is_chargeback={is_chargeback}&offer_id={offer_id}&offer_name={offer_name}`
4. **Enable HMAC security hash** for the callback; copy the Publisher API Key.
5. **Enable reversal callbacks** (chargeback protection).
6. Set env (Vercel + any server host):
   - `AYET_POSTBACK_SECRET=<publisher api key>` (server-only secret)
   - `NEXT_PUBLIC_AYET_OFFERWALL_ENABLED=true`
   - `NEXT_PUBLIC_AYET_OFFERWALL_ADSLOT=<web offerwall adslot id>`
   - Confirm `SUPABASE_SERVICE_ROLE_KEY` present server-side.
7. Apply the migration to prod (additive/inert until live).
8. Fire a test conversion from the ayeT dashboard; confirm a row in
   `offerwall_postbacks` and the user balance increment; confirm a duplicate test
   postback does NOT double-credit.
9. (Optional) Ask ayeT for callback source IPs; add an allowlist at the edge.
