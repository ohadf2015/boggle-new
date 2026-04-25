# AdMob Expansion — Segmented Units + Content Banner

**Date:** 2026-04-25
**Author:** Ohad Fisher
**Status:** Approved

## Problem

LexiClash currently runs three AdMob unit IDs (one rewarded, one interstitial, one banner). All rewarded surfaces share a single unit, so AdMob's mediation can only optimize one waterfall and we cannot see per-surface eCPM, fill rate, or revenue. The single banner unit serves both in-game and content surfaces, which conflates two very different user contexts (active play vs. stat browsing).

## Goal

Add ad inventory and analytics granularity without harming UX:

1. Segment rewarded ads into one unit per surface so AdMob can optimize each waterfall independently and we can attribute revenue.
2. Add a second banner unit for non-game content surfaces (profile, leaderboard, shop) so its eCPM floor is tuned separately from the in-game banner.

## Non-goals

- App Open ads (rejected — irritating format).
- Mid-game interstitials (rejected — rage-quit risk).
- Native Advanced ads on blog (out of scope — `@capacitor-community/admob` does not support native templates; AdSense would be a separate ecosystem).
- Replacing the global `AnchoredNativeBanner` with per-page banners (violates existing memory rule).
- iOS-specific units (iOS shares Android IDs today; keep that pattern).

## Design

### AdMob console — provision via Playwriter

Six new ad units under app `LexiClash Android` (`ca-app-pub-1896836706464880`):

| Display name | Format |
|---|---|
| Android - Rewarded - Hint | Rewarded |
| Android - Rewarded - DoubleGold | Rewarded |
| Android - Rewarded - Freeze | Rewarded |
| Android - Rewarded - Retry | Rewarded |
| Android - Rewarded - TimeLow | Rewarded |
| Android - Banner - Content | Banner |

Playwriter script `scripts/admob-provision-units.mjs` opens `https://apps.admob.com/`, navigates to the app, creates each unit, and writes the resulting `ca-app-pub-…/…` IDs to `scripts/admob-new-units.json`. The script is idempotent: if a unit with the exact display name already exists it reuses that ID.

### Config

`fe-next/lib/admob-config.ts`:

```ts
export type RewardedSurface = 'hint' | 'doubleGold' | 'freeze' | 'retry' | 'timeLow' | 'generic';
export type BannerVariant = 'game' | 'content';

export interface AdmobConfig {
  rewardedUnits: Record<RewardedSurface, string>; // generic = current shared unit
  interstitialAdId: string;
  bannerUnits: Record<BannerVariant, string>;
}
```

Each surface ID resolves through this fallback chain:

1. `NEXT_PUBLIC_ADMOB_REWARDED_HINT_ANDROID` (per-platform, per-surface)
2. `NEXT_PUBLIC_ADMOB_REWARDED_HINT` (cross-platform, per-surface)
3. `NEXT_PUBLIC_ADMOB_REWARDED_ANDROID` (legacy generic)
4. `NEXT_PUBLIC_ADMOB_REWARDED_ID` (legacy generic)
5. `DEFAULTS[platform].rewardedUnits.generic` (hard-coded current unit)

Same pattern for the content banner: `*_BANNER_CONTENT_*` falls back to `*_BANNER_*` falls back to current banner ID. **Result:** if the AdMob console step is delayed, the app keeps working with the current units. No deploy ordering required.

### Rewarded hook

`fe-next/hooks/useRewardedAd.ts` — add option:

```ts
interface UseRewardedAdOptions {
  // ...existing
  surface?: RewardedSurface; // default 'generic'
}
```

Inside `useAdMob.showRewarded(...)`, accept the surface and look up `config.rewardedUnits[surface]`. Existing callers default to `'generic'` and behavior is unchanged.

### Banner hook

`fe-next/hooks/useAdMob.ts` — `showBanner` gains a `variant: BannerVariant = 'game'` parameter that picks `config.bannerUnits[variant]`. Default preserves current behavior.

### Callsite updates

| File | Change |
|---|---|
| `components/daily/WordWheelGame.tsx` | `useRewardedAd({ surface: 'hint' })` |
| `components/singleplayer/SinglePlayerResults.tsx` (and the gold top-up button) | `surface: 'doubleGold'` |
| `components/daily/WatchAdForFreezeButton.tsx` | `surface: 'freeze'` |
| `components/adventure/RetryAssistModal.tsx`, `BossRushResults.tsx` | `surface: 'retry'` |
| `components/ads/TimeLowAdPrompt.tsx` | `surface: 'timeLow'` |
| `components/ads/AnchoredNativeBanner.tsx` | When mounted on `/profile`, `/leaderboard`, `/shop`, pass `variant: 'content'`. Game surfaces stay `'game'` (default). |

### Tests (TDD — RED first)

- `lib/__tests__/admob-config.test.ts` — extend with: returns segmented IDs from env, falls back through the chain, `bannerUnits.content` defaults to game banner when env unset.
- `hooks/__tests__/useRewardedAd.surface.test.tsx` (new) — `surface: 'hint'` resolves to hint unit ID; missing surface defaults to generic.
- `hooks/__tests__/useAdMob.test.tsx` — extend: `showBanner({ variant: 'content' })` calls `AdMob.showBanner` with the content unit ID.

No test touches the network — all use mocked `AdMob` plugin (already in `__mocks__`).

### Telemetry

Pass `surface` through to `trackRewardedAdWatched(platform, awarded, surface)` so PostHog can break down revenue by surface. Backwards compatible (param optional).

## UX guarantees

- Zero new ad placements visible to users. The five rewarded surfaces stay where they are; the content banner is the same anchored banner already on those screens, just billing through a different unit ID.
- No change to the daily 10-ad cap or 3/hr placeholder cooldown.
- No change to `gameActive` gating, sound muting, or CrazyGames priority.

## Rollout

1. Playwriter creates the six units and saves IDs to `scripts/admob-new-units.json`.
2. IDs added to Railway env (`NEXT_PUBLIC_ADMOB_*`) and to `DEFAULTS` as fallback.
3. TDD: write the three test files, watch them fail.
4. Implement config + hooks + callsites until green.
5. `npm run lint && npm run test:fast && npm run build:fast`.
6. Single commit on master per `.claude/rules/10-git.md` (no branches per memory).
7. Android release optional this cycle — units are live the moment env vars are set; no native code change required since the plugin already supports per-call `adId`.

## Risks

- **Eligibility lag**: AdMob takes minutes-to-hours to start serving real ads on a fresh unit. The fallback chain means we keep serving the existing unit until each new unit warms up, so revenue never dips.
- **Playwriter session drift**: AdMob console UI changes break the script. Mitigation — script writes a screenshot to `scripts/admob-debug-*.png` on failure and the spec authors can rerun.
- **Test isolation**: existing `useRewardedAd` tests must not regress. The surface param is optional with a default, so older tests pass untouched.

## Files touched

```
docs/superpowers/specs/2026-04-25-admob-expansion-design.md   (new)
fe-next/lib/admob-config.ts                                   (modified)
fe-next/lib/__tests__/admob-config.test.ts                    (modified)
fe-next/hooks/useRewardedAd.ts                                (modified)
fe-next/hooks/useAdMob.ts                                     (modified)
fe-next/hooks/__tests__/useRewardedAd.surface.test.tsx        (new)
fe-next/hooks/__tests__/useAdMob.test.tsx                     (modified)
fe-next/components/ads/AnchoredNativeBanner.tsx               (modified)
fe-next/components/daily/WordWheelGame.tsx                    (modified)
fe-next/components/singleplayer/SinglePlayerResults.tsx       (modified)
fe-next/components/singleplayer/results/...GoldTopUp...       (modified)
fe-next/components/daily/WatchAdForFreezeButton.tsx           (modified)
fe-next/components/adventure/RetryAssistModal.tsx             (modified)
fe-next/components/adventure/BossRushResults.tsx              (modified)
fe-next/components/ads/TimeLowAdPrompt.tsx                    (modified)
fe-next/utils/growthTracking.ts                               (modified — surface param)
scripts/admob-provision-units.mjs                             (new)
scripts/admob-new-units.json                                  (generated)
```

## Out of scope (future)

- iOS-specific unit IDs once iOS ships.
- AdSense on blog/glossary (separate ticket — different SDK, different policy compliance).
- Rewarded Interstitial format if user testing later approves.
