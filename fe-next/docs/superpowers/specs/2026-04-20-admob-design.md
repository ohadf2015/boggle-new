# AdMob Complete Implementation Design

**Date:** 2026-04-20  
**Status:** Approved

## Overview

Implement Google AdMob (via `@capacitor-community/admob`) in LexiClash for Android and iOS. Three ad formats: rewarded video, interstitial, and banner. Ads only fire on native platforms (Capacitor WebView); web users see nothing. A `hasNoAds` stub allows future IAP "No-Ads Unlock" to suppress all ads with one line change.

## Files to Create

| File | Purpose |
|------|---------|
| `lib/admob-config.ts` | Unit IDs + constants (test IDs now, env-swappable later) |
| `contexts/AdMobContext.tsx` | Provider: init, preload, session counter, hasNoAds |
| `hooks/useAdMob.ts` | Consumer hook: showRewarded, showInterstitial, showBanner |
| `components/ads/AdBanner.tsx` | Banner component (mounts/unmounts AdMob banner) |

## Files to Modify

| File | Change |
|------|--------|
| `ios/App/App/Info.plist` | Add `GADApplicationIdentifier` key (test App ID) |
| `capacitor.config.ts` | Add `AdMob` plugin config with app IDs |
| `app/[locale]/layout.tsx` | Wrap with `AdMobProvider` |

## Ad Unit IDs

Using Google's official test IDs until real IDs are added. Swap by setting env vars:
- `NEXT_PUBLIC_ADMOB_APP_ID_ANDROID` / `NEXT_PUBLIC_ADMOB_APP_ID_IOS`
- `NEXT_PUBLIC_ADMOB_REWARDED_ANDROID` / `NEXT_PUBLIC_ADMOB_REWARDED_IOS`
- `NEXT_PUBLIC_ADMOB_INTERSTITIAL_ANDROID` / `NEXT_PUBLIC_ADMOB_INTERSTITIAL_IOS`
- `NEXT_PUBLIC_ADMOB_BANNER_ANDROID` / `NEXT_PUBLIC_ADMOB_BANNER_IOS`

**Test IDs (Google official):**
- Android App: `ca-app-pub-3940256099942544~3347511713`
- iOS App: `ca-app-pub-3940256099942544~1458002511`
- Rewarded Android: `ca-app-pub-3940256099942544/5224354917`
- Rewarded iOS: `ca-app-pub-3940256099942544/1712485313`
- Interstitial Android: `ca-app-pub-3940256099942544/1033173712`
- Interstitial iOS: `ca-app-pub-3940256099942544/4411468910`
- Banner Android: `ca-app-pub-3940256099942544/6300978111`
- Banner iOS: `ca-app-pub-3940256099942544/2934735716`

## Architecture

### `lib/admob-config.ts`
Exports typed config object with platform-resolved unit IDs. Pure data, no side effects.

### `contexts/AdMobContext.tsx`
- Initializes AdMob on mount (native only) via `AdMob.initialize()`
- Tracks `sessionCount` (ref, not state — no re-renders)
- Tracks `totalSessions` (ref — for first-3-session warmup period)
- Exposes `recordGameEnd()` for interstitial trigger logic
- `hasNoAds()` — returns `false` for now; wire to IAP entitlement check later
- Preloads rewarded ad and interstitial on init and after each show

### `hooks/useAdMob.ts`
Three functions:
- `showRewarded(onReward: () => void)` — shows rewarded ad; calls `onReward` on success
- `showInterstitial()` — calls `recordGameEnd()` internally; shows if conditions met
- `showBanner(position?)` / `hideBanner()` — for manual control outside `<AdBanner>`

### `components/ads/AdBanner.tsx`
- Mounts: calls `AdMob.showBanner()` with `ADAPTIVE_BANNER` size, `BOTTOM_CENTER` position
- Unmounts: calls `AdMob.removeBanner()`
- Returns `null` on web (non-native)
- Renders a spacer `div` of banner height so layout doesn't jump

## Ad Flow Details

### Rewarded Video
```
User taps "Watch Ad → +20 gold"
→ useAdMob.showRewarded(onReward)
→ hasNoAds()? → return
→ AdMob.prepareRewardVideoAd({ adId })
→ AdMob.showRewardVideoAd()
→ listener: RewardVideoEventEnum.Rewarded → onReward()
→ onReward calls CoinContext.awardWatchedAd('admob') → +20 gold toast
→ preload next rewarded ad in background
```

### Interstitial
```
Game ends → AdMobContext.recordGameEnd()
→ totalSessions++ (warmup: skip first 3 total sessions)
→ hasNoAds()? → return
→ sessionGameCount++ 
→ sessionGameCount % 3 !== 0? → return
→ AdMob.prepareInterstitial({ adId })
→ AdMob.showInterstitial()
→ preload next interstitial in background
```

### Banner
```
<AdBanner /> mounts (post-game screen, main menu)
→ Capacitor.isNativePlatform()? → proceed
→ AdMob.showBanner({ adId, position: BOTTOM_CENTER, size: ADAPTIVE_BANNER })
→ on unmount → AdMob.removeBanner()
```

## Placement Map

| Screen | Ad Type | Condition |
|--------|---------|-----------|
| Post-game results | Banner | Always (native, no-ads check) |
| Post-game results | Rewarded | "Watch ad → +20 gold" button |
| Singleplayer game | Rewarded | "Watch ad → get hint" button |
| After game end | Interstitial | Every 3rd game, after 3-session warmup |
| Main menu | Banner | Always (native, no-ads check) |

## Native Config Changes

### `ios/App/App/Info.plist`
Add key `GADApplicationIdentifier` with test App ID value.

### `capacitor.config.ts`
```ts
plugins: {
  AdMob: {
    appId: {
      ios: process.env.ADMOB_APP_ID_IOS ?? 'ca-app-pub-3940256099942544~1458002511',
      android: process.env.ADMOB_APP_ID_ANDROID ?? 'ca-app-pub-3940256099942544~3347511713',
    },
    initializeForTesting: process.env.NODE_ENV !== 'production',
  },
  // ... existing plugins
}
```

### `android/app/build.gradle`
Already reads `ADMOB_APP_ID` from env — no change needed. ✅

## hasNoAds Stub
```ts
// In AdMobContext — replace body when IAP is wired
function hasNoAds(): boolean {
  return false; // TODO: check IAP entitlement 'no_ads_unlock'
}
```

## Testing Strategy
- Unit tests for `admob-config.ts` — correct ID resolution by platform
- Unit tests for context logic — session counting, warmup period, hasNoAds bypass
- Mock `@capacitor-community/admob` in tests (Capacitor returns no-ops in JSDOM)
- E2E: manual test on Android emulator with test IDs

## Out of Scope
- Real AdMob account / ad unit ID setup (manual step)
- IAP "No-Ads Unlock" wiring (future sprint)
- iOS App Store review compliance (ATT prompt — future sprint before iOS release)
