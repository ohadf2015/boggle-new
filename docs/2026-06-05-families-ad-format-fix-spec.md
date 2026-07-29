# Families Ad Format Requirements — rejection fix (v5740)

**Date:** 2026-06-05
**Trigger:** Google Play policy rejection, version code 5740.

> *"Interstitial ads on launch: Interstitial ads or in-app purchase offers appear
> immediately when the app starts... ensure your app utilizes a version of the
> Families Self-Certified Ads SDKs listed in the program."*

## Diagnosis

The rejection has **two** halves. The headline ("ad on launch") is largely
boilerplate; the actionable substance is the SDK-certification line.

**Evidence gathered (2026-06-05):**

1. **No app-open ad** exists (grep clean across `hooks/ lib/ contexts/ components/ app/`).
2. **No interstitial fires on launch/mount.** All 9 interstitial triggers are
   `*-complete` placements (end of game/level/round): `ResultsPage.tsx:714`,
   `SinglePlayerResults`, `DailyChallengeResults`, `DailyWordHuntResults`,
   `BossRushResults`, `LeagueResults`, `ChallengeResults`, `adventure level-complete`.
3. **Warmup counters are in-memory `useRef`** (`AdMobContext.tsx:56-57`), reset on
   every cold start → the 3-game warmup re-applies each launch, so an interstitial
   *cannot* fire on a fresh session. Route-restore-to-results would be
   `totalGameEnds === 1` ≤ 3 → no show. The "ad on launch" claim is not
   reproducible from the interstitial path.
4. **No auto-launching IAP/purchase modal.** "Remove Ads" (`RemoveAdsProbe`) is a
   settings surface ("Coming Soon"); "Earn Coins" offerwall is a web-only button;
   `SignupPromptHost` is gated to first-win + interaction. None open on launch.
5. **Missing child-directed SDK config.** `AdMob.initialize()` is called with only
   `{ initializeForTesting }` — **no** `tagForChildDirectedTreatment`,
   `tagForUnderAgeOfConsent`, or `maxAdContentRating`. The installed plugin
   `@capacitor-community/admob@8.0.0` **supports all three** as
   `AdMobInitializationOptions`.
6. **The `unknown`-tier ad gap.** `lib/families/adPolicy.ts` deliberately serves
   ads to undeclared guests (`unknown` tier) and suppresses only the declared
   `child` tier. For a **children-inclusive (Families) Play listing**, a user we
   don't *know* is an adult must be treated as a child → serving undeclared
   guests interstitials *is* the violation. (Note: `lib/families/socialPolicy.ts`
   already treats `unknown` identically to `child` for every social surface — the
   ad policy is the lone divergence.)

## Why this is web-deployable

This is a **remote-URL Capacitor app**. `AdMob.initialize(options)` is called from
JS (`AdMobContext.tsx:87`); the options cross the Capacitor bridge to the native
plugin, which (v8) already reads `tagForChildDirectedTreatment` /
`tagForUnderAgeOfConsent` / `maxAdContentRating`. So the child-directed config
**ships via web deploy** — no AAB required. A fresh AAB (versionCode 5741) is
belt-and-suspenders to (a) guarantee the native plugin in production is v8 and
(b) give Google a new binary to re-review.

## Changes

### 1. `lib/families/adPolicy.ts` (pure logic, type-only admob import)

- **Keep** `shouldSuppressAdsForTier(tier)` = `child` only — the all-format hard
  gate (zero ads to an actual child). Banners + opt-in rewarded keep serving
  `unknown`/`adult` (Families permits G-rated banners & opt-in rewarded).
- **Add** `shouldSuppressInterstitialForTier(tier)` = `tier !== 'adult'` —
  interstitials (the cited format) only reach **known adults**.
- **Add** `resolveChildDirectedAdInit(tier)` → `{ tagForChildDirectedTreatment,
  tagForUnderAgeOfConsent, maxAdContentRating }`. Tags `true` unless the user is a
  known adult; `maxAdContentRating` always `General` (G). Type-only import of
  `MaxAdContentRating` keeps the file free of any runtime admob dependency.

### 2. `contexts/AdMobContext.tsx`

- Spread `resolveChildDirectedAdInit(tier)` into the `AdMob.initialize({...})`
  call (alongside `initializeForTesting`).
- `shouldShowInterstitial()` and `shouldPreloadInterstitial()` gate on
  `shouldSuppressInterstitialForTier(tier)` (was `hasNoAds()`), so `unknown` and
  `child` never get interstitials. `hasNoAds()` stays `child`-only for the
  banner/rewarded paths in `useAdMob.ts`.

### 3. Tests (TDD)

- `lib/families/adPolicy.test.ts`: add `shouldSuppressInterstitialForTier` (child &
  unknown → true, adult → false) and `resolveChildDirectedAdInit` (adult → tags
  false + G; child/unknown → tags true + G) cases. Existing `shouldSuppressAdsForTier`
  cases unchanged.
- `contexts/__tests__/AdMobContext.test.tsx`: update the `initialize` assertion to
  include child-directed options; move warmup/cap interstitial tests to
  `tier='adult'`; add `unknown`/`child` → `shouldShowInterstitial()===false` cases.

## Out of scope / verified-clean

- No launch IAP to remove (purchase surfaces are settings/profile-navigated).
- Banner/rewarded suppression for `unknown` not needed — child-directed + G-rating
  makes them compliant while preserving the revenue core.
### 4. Deferred init (revenue — IMPLEMENTED)

`AdMob.initialize()` previously ran in the provider's first-render block, before
`useAuth()` resolved the profile (`loading: true` → `birth_year` null → tier
`unknown`), so **every session initialized child-directed / non-personalized**,
including logged-in adults. Fixed:

- `useSocialCapabilities` now exposes `authResolved` (= `!useAuth().loading`) —
  true once auth has SETTLED (profile loaded, or confirmed guest). Distinct from
  `ageKnown` (a terminal guest is `authResolved` but not `ageKnown`).
- `AdMobContext` init moved into a `useEffect` gated on `authResolved` (runs once
  via an `initStarted` ref). A known adult now inits with the **adult** config
  (personalized); a genuine guest (terminal `unknown`) still inits child-directed.
- Adds ~one auth-resolution tick of latency before the first ad init — negligible,
  and ads were already gated separately.

## Other follow-ups

- **AAB 5741 (REQUIRED to clear the rejection):** a web deploy ships the JS config
  but does not trigger Play re-review, and "utilize a Families Self-Certified Ads
  SDK" is a static AAB scan. Cut + submit a fresh binary built from
  `@capacitor-community/admob@8` (Google Mobile Ads SDK `24.9.+` — current,
  self-certified). Confirm `versionCode` increments past 5740.
- **Purchase-surface tier gating (minor):** `RemoveAdsProbe` ("Coming Soon") and
  `EarnCoinsOfferwall` (web-only) aren't tier-gated — a known `child` could still
  see them. Low risk (no auto-launch, not live IAP) but Families dislikes purchase
  prompts to known children; add a `tier !== 'child'` guard when convenient.

## Age thresholds (reference)

- COPPA "child" = **under 13**; `computeSocialTier` returns `adult` only when
  guaranteed ≥13 (`CHILD_AGE_THRESHOLD = 13`).
- EEA GDPR-K "age of digital consent" is 13–16 by country; `tagForUnderAgeOfConsent`
  (TFUA) covers the EEA case for non-adult users.
