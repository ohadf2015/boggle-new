# Spec: Rewarded-ad gate on daily catch-up play

## Problem
Catch-up (playing a daily you missed in the last 3 days via `?date=YYYY-MM-DD`)
currently launches for free. Product wants: **playing a previous day's daily
requires watching a rewarded ad** (native), matching the existing WordHunt
forfeit/retry ad-gate.

## Current behaviour (verified)
- `CatchUpSuggestion.tsx` renders missed-day links → `…/daily/word-hunt?date=…`.
- `DailyChallenge.tsx` reads `?date=`, validates via `isCatchUpDate`, sets
  `isCatchup`. Start funnels through `handleStartGame()` (DailyReadyScreen → onStart).
- `handleStartGame()` already ad-gates the **forfeit/retry** case
  (`surface:'retry'`, native-only, web degrades free) via `useRewardedAd`.
- `useRewardedAd` is lazy-prepare (no auto-prepare on mount) → a 2nd hook
  instance is free until shown.

## Design
Gate at the **Start choke point** (`handleStartGame`), NOT the suggestion card —
`?date=` is reachable by deep-link/refresh/back, so a card-only gate is a bypass.

Place the gate **last**, after the server already-played check, so we never burn
an ad on a deep-linked already-completed day.

Native-only; web (and no-ad / placeholder-cooldown) degrades to **free** play —
identical contract to the forfeit gate.

Ad is shown **once per catch-up date** (a ref, reset when `catchupDate` changes).
Each distinct missed day is its own unlock.

### Pure decision helper (TDD'd)
`utils/dailyChallenge/catchUp.ts`:
```ts
shouldGateCatchUpBehindAd({
  isCatchup, alreadyUnlocked, isNative, isAdAvailable, isPlaceholderCooldown
}): boolean
// true ⇢ show the ad and block start; false ⇢ proceed (today's daily, already
// unlocked this date, web, no ad, or placeholder cooldown).
```

### AdMob surface
Add `'catchup'` to `RewardedSurface` for clean per-placement analytics + future
waterfall split. Default unit reuses the `retry` unit id (same "unlock a play"
semantics); env override key `NEXT_PUBLIC_ADMOB_REWARDED_CATCHUP[_ANDROID|_IOS]`.

### Wiring (`DailyChallenge.tsx`)
- `catchupAdUnlockedRef` (reset on `catchupDate` change).
- 2nd `useRewardedAd({ rewardKind:'feature', surface:'catchup', onRewardEarned })`.
- Extract `startPlaying()` (track + `setPhase('playing')`) from the tail.
- In `handleStartGame`, after the server check, before `startPlaying()`:
  if `shouldGateCatchUpBehindAd(...)` → `showCatchUpAd(); return;`.
- Reward callback: `catchupAdUnlockedRef.current = true; startPlaying();`.

### UX hint (set expectations)
`CatchUpSuggestion` card: small `📺` + `t('daily.catchUp.watchAd')` shown only on
native, so tapping a missed day isn't a bait-and-switch.

## i18n
`daily.catchUp.watchAd` ×5 (en/he/sv/ja/es; he/sv/ja/es native-review pending).

## Tests
- `catchUp.test.ts`: `shouldGateCatchUpBehindAd` truth table.
- `admob-config.test.ts`: `catchup` surface default + env override.

## Out of scope
- Server enforcement (gate is client UX; submission already validated by date).
- Dedicated catchup AdMob unit (reuses retry until product wants a split).
- Frequency cap beyond once-per-date-per-mount.
