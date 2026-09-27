# Boost Picker — Design (v1)

**Status:** Design / pre-implementation
**Date:** 2026-04-26
**Owner:** Ohad
**Related memory:** monetization-strategy, economy-balance-audit-2026-04-22, feedback-web-no-ads-block-boosts

## Why

Memory's SEO sprint flagged "sabotage power-ups" as pending. Sabotage (Popple-style attack/grief mechanics) contradicts shipped vs-popple landing copy ("speed and volume, not strategic sabotage"). Self-buff power-ups are the brand-aligned alternative AND map directly to the Phase-1 monetization quick win ("Rewarded video ads, opt-in, 2-3x ad revenue").

Adventure mode already ships 3 power-ups (`types/adventure/powerups.ts`: freezeTime, hint, scoreMultiplier). v1 = extend that pattern across all modes via a rewarded-ad-gated pre-game picker.

## Scope

**In:**
- Pre-game boost picker available in MP lobby + SP/Drills/Classic pre-Play screens
- 4 buffs: 3 existing (freezeTime, hint, scoreMultiplier) + 1 new (firstWordBonus, MP-only)
- Rewarded-ad gating with daily cap (5/day shared counter)
- Server-side enforcement + signed claim token

**Out (defer v2):**
- Gold-cost alternative path (preserves single-currency rule)
- Stacking buffs (v1 = one per game)
- Streak-based free boosts
- Cosmetic boost variants

## Architecture

### Data
- New table `boost_claims` (`user_id`, `session_id`, `boost_type`, `claimed_at`). Unique index `(user_id, session_id)` for idempotency.
- New column `profiles.daily_boost_count` (int default 0).
- Existing `pg_cron` daily-reset pattern: new jobid resets `daily_boost_count` to 0 at UTC midnight.

### Server contract

**RPC** `claim_boost(p_user_id UUID, p_session_id TEXT, p_boost_type TEXT) RETURNS TABLE(success BOOLEAN, remaining INT, error_message TEXT)`

Behavior (atomic, FOR UPDATE on profiles row):
1. Reject if `daily_boost_count >= 5` → return `cap_reached`.
2. Reject if `(user_id, session_id)` already in `boost_claims` → return `already_claimed`.
3. Reject if `boost_type NOT IN ('freezeTime','hint','scoreMultiplier','firstWordBonus')` → return `invalid_type`.
4. Insert into `boost_claims`. Increment `profiles.daily_boost_count`. Return `(true, 5 - new_count, null)`.

**Endpoints:**
- `POST /api/boosts/claim` — body `{ sessionId, boostType, adReceipt }`. Server verifies ad receipt server-side via existing `useRewardedAd` infra (rejects on placeholder/web per memory rule). On success: calls `claim_boost` RPC + returns `{ token, remaining }`.
- `GET /api/boosts/status` — returns `{ remaining, capPerDay: 5, resetAt }` for picker UI.

**Token format:** `b1.<sessionId>.<boostType>.<expEpoch>.<HMAC-SHA256>`. Signed with `BOOST_TOKEN_SECRET` env var. TTL 5 min from claim. Counter decrements on claim, NOT on use — anti-stockpile (forfeit if game not started in window).

### Client

**`<BoostPicker>` modal:**
- Trigger: `<BoostButton>` placed in MP lobby + SP/Drills/Classic pre-Play screens
- 4 boost cards (Neo-Brutalist styled, per design-system.md). Each card: icon, title (`t()`), description (`t()`), "Watch ad" CTA (or "Active this game" if already claimed)
- Header: `Boosts left today: N/5`
- Picker disabled when MP lobby state = `starting`. Lock visual = pressed shadow + "Game starting…" copy
- Reduced-motion gates entrance animation (memory rule for confetti/celebrations)
- RTL: existing `shadow-hard` auto-flip handles Hebrew

**`useBoostClaim()` hook:** wraps `useRewardedAd` → POST `/api/boosts/claim` → stores token in session storage keyed by `sessionId`. Returns `{ claim, status, isLoading }`.

### Buff effect application

| Buff | Where applied | Trust source |
|------|---------------|--------------|
| `freezeTime` | Client (already wired in adventure; reuse hook in other modes) | Token presence checked in MP server score-calc |
| `hint` | Client (existing free-reveals logic; +1 reveal if token valid) | Token presence checked in MP server score-calc |
| `scoreMultiplier` | Client display only (v1); server v2 pending WordDetail.ts plumbing | Server-validated token (v2) |
| `firstWordBonus` (MP only) | Server `gameResults.ts` only — first valid word in `wordDetails` × 2 | Server-validated token |

**Note on scoreMultiplier (v1 limitation):** WordDetail lacks a `ts` (timestamp) field in current schema, so server-side multiplier application is deferred to v2. For v1, scoreMultiplier is applied client-side for display only; server validates token presence but does not re-apply the multiplier to final scores. Server validates token signature + `sessionId` match. Client never trusted for score math (firstWordBonus).

## Files

**New:**
- `supabase/migrations/YYYYMMDDHHMMSS_boost_claims.sql` (table + RPC + pg_cron daily reset job — naming per existing migration convention)
- `backend/services/economy/claimBoost.ts` (RPC wrapper, returns signed token; pairs with `awardCoinsServer` shipped df6b67f83)
- `backend/services/economy/__tests__/claimBoost.test.ts`
- `backend/utils/boostToken.ts` (sign + verify)
- `backend/utils/__tests__/boostToken.test.ts`
- `app/api/boosts/claim/route.ts`
- `app/api/boosts/claim/__tests__/route.test.ts`
- `app/api/boosts/status/route.ts`
- `components/boosts/BoostPicker.tsx`
- `components/boosts/BoostButton.tsx`
- `components/boosts/__tests__/BoostPicker.test.tsx`
- `components/boosts/__tests__/BoostButton.test.tsx`
- `hooks/useBoostClaim.ts`
- `hooks/__tests__/useBoostClaim.test.ts`
- `shared/utils/boostEffects.ts` (pure score-modifier fns, server+client share)
- `shared/utils/__tests__/boostEffects.test.ts`

**Touched:**
- `backend/services/gameLifecycle/gameResults.ts` — verify token, apply MP firstWordBonus + scoreMultiplier in score-calc
- `app/[locale]/multiplayer/.../Lobby.tsx` — mount `<BoostButton>`
- `app/[locale]/(sp/drill/classic pre-play screens)` — mount `<BoostButton>` (3 entry points; exact files TBD during implementation)
- `translations/{en,he,sv,ja,es}.json` — ~10 strings each (4 buff names, 4 descriptions, picker title, cap copy)
- `shared/types/boosts.ts` (NEW) — defines `BoostType` union + `BoostConfig`. Decoupled from `types/adventure/powerups.ts` (`PowerUpType`) because the adventure state machine (ready/active/cooldown) doesn't apply to one-shot pre-game picks. Adventure power-ups stay as-is.

## Guardrails

- **Web no-ads:** existing `useRewardedAd` rejects placeholder/web per memory `feedback-web-no-ads-block-boosts.md`. API confirms by re-checking ad receipt server-side. UI shows "Available on mobile" fallback copy.
- **Token TTL:** 5 min. Counter decremented on claim (not use) — prevents stockpiling. Wasted token = lost cap slot, surfaces as friction users self-correct.
- **Idempotency:** unique index on `(user_id, session_id)` blocks repeat claims for same game. Same defense-in-depth pattern as recent economy fix.
- **Cap drift:** cap of `5/day` lives as Postgres function constant. Tunable via migration without code redeploy.
- **A11y:** picker keyboard-navigable (Tab through cards, Enter to claim). Screen-reader labels for boost name + cap remaining. Reduced-motion gates animation.
- **i18n:** all strings via `t()`. Hebrew translation per `feedback-ai-hebrew-translation.md` rule (no AI translation; mark for human translator).

## Telemetry

PostHog events:
- `boost_offered` (mode, surface_location)
- `boost_picker_opened`
- `boost_claim_started` (boost_type)
- `boost_claim_completed` (boost_type, remaining_today)
- `boost_claim_failed` (reason: `cap_reached | ad_skipped | network | invalid_token`)
- `boost_applied` (boost_type, mode, score_delta_attributable)
- `boost_token_wasted` (boost_type, reason: `expired | game_not_started`)

Dashboards: tie attach-rate to mode + survival rate (do boosters stay engaged longer?).

## Test plan (TDD)

Per `.claude/rules/22-tdd-strict.md` — write tests first, RED → GREEN → REFACTOR.

1. **Migration test:** RPC cap enforcement (5/day reject), midnight reset behavior, idempotency on `(user_id, session_id)`. Use migration test runner (or Supabase local).
2. **Token sign/verify:** roundtrip happy path, tampered signature rejected, expired token rejected, wrong sessionId rejected.
3. **`claimBoost` helper:** success, cap reached, invalid type, RPC error, no-supabase. Mirror pattern from `awardCoinsServer.test.ts`.
4. **`/api/boosts/claim` route:** auth required, ad-receipt validated, returns token on success, rejects on web placeholder per `useRewardedAd` rules.
5. **`/api/boosts/status` route:** returns `{remaining, capPerDay, resetAt}`. Updates after claim.
6. **`<BoostPicker>` UI:** renders 4 cards, keyboard-navigable, disabled state when lobby is `starting`, RTL flip in Hebrew, reduced-motion gates animation.
7. **`useBoostClaim` hook:** ad-then-claim flow, token persisted in session storage by sessionId, status reflects API.
8. **Server effect application:** `gameResults.ts` verifies token + applies `firstWordBonus` 2x to first valid word. `scoreMultiplier` is client-display only in v1 (deferred server-apply to v2). Untrusted/missing/expired token = no multiplier for firstWordBonus.
9. **E2E:** lobby → boost picker → mock ad → game start → MP final score reflects 2x first word; counter decremented; cap visible.

## Open questions resolved

- **Sabotage vs self-buff:** self-buff (preserves vs-popple SEO promise + brand identity).
- **Gold-cost vs ad-only:** ad-only for v1 (memory's monetization Phase-1 quick win; defers single-currency rebalance).
- **Cap model:** 5/day shared counter (single midnight reset, simple to display, tunable).
- **Picker location:** MP lobby (visible while waiting); SP/drills/classic pre-Play screens.
- **Trust model:** server enforces multiplier math; client = display only.

## Risks

- **Ad inventory fill rate** (memory: gated by Play Store public listing). Low fill = boost picker mostly broken on Android. Mitigation: graceful "no ad available — try later" copy. Telemetry on `boost_claim_failed.reason=no_ad_available`.
- **Cap-reset cron drift:** if cron skips a day, players rate-limited. Mitigation: defensive query on read — if `last_reset_date < today`, server resets inline.
- **Token secret leak:** rotation requires re-deploy (constant in env). Acceptable — value of forging a single boost is low.
- **Education duels** (separate broken pipeline flagged in economy memory): out of scope. Don't conflate.
