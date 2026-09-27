# Daily Word Hunt — Exit Black-Screen Fix + Forfeit Ad-Gate

**Date:** 2026-05-21
**Scope:** `components/daily/*`, `hooks/useNavigationGuard.ts`, `utils/dailyChallenge/*`, translations.

## Problem

1. **Bug:** Exiting the Word Hunt daily challenge mid-game can show a **black screen**.
2. **Feature:** Don't let players silently bail mid-game. On exit, warn that the run
   **won't be saved** and that they'll **need to watch an ad to play again** today.

## Root cause (black screen)

Multiple navigation hazards stack on the quit path; we harden all of them rather than
guess which fires on a given device:

- `DailyChallenge.handleBack` does `window.location.href = '/${lang}/daily'` — a **hard
  reload**. While the game is active, `useNavigationGuard`'s `beforeunload` handler is
  armed (`enabled = !isGameOver`). In a Capacitor Android WebView a guarded
  `beforeunload` during a hard nav can abort and leave a blank view.
- The guard's popstate-cleanup runs `window.history.go(-1)` on teardown, which can race
  the in-flight navigation.
- The `<DailyWordHuntSurvival>` child in the parent `AnimatePresence mode="wait"` has no
  `key`, so a phase→phase transition can orphan the exiting node at `opacity:0`.

## Changes

### Phase 1 — Black-screen hardening (no behavior change)
1. `useNavigationGuard`: skip the `history.go(-1)` cleanup while the page is unloading
   (track via `pagehide`). Prevents the back-nav race for every caller.
2. `DailyChallenge`: navigate via Next `router.push('/${lang}/daily')` instead of
   `window.location.href` — client nav, no page unload, no `beforeunload`.
3. `DailyWordHuntSurvival`: add a `quitting` state that flips the guard to
   `enabled:false` *before* navigating, so neither `beforeunload` nor popstate fires.
4. `DailyChallenge`: add `key="playing"` to `<DailyWordHuntSurvival>`.

### Phase 2 — Forfeit ad-gate (native-only, graceful web degrade)
- `utils/dailyChallenge/storage.ts` + `constants.ts`: add a per-day forfeit marker
  `lexiclash_word_hunt_forfeit_<lang>_<date>` with helpers
  `markWordHuntForfeitToday`, `hasWordHuntForfeitToday`, `clearWordHuntForfeitToday`.
  Re-export from the `utils/dailyChallenge` barrel.
- `DailyChallenge`:
  - New `handleQuitMidGame`: if not practice → `markWordHuntForfeitToday(lang)`, then
    `router.push('/${lang}/daily')`. Wired to the survival `onQuit` prop (the
    only mid-game exit). Ready/results keep plain `handleBack`.
  - Init effect: when there's no saved result and (not practice) the forfeit marker is
    set → stay on `'ready'` but set `forfeitedToday = true`.
  - `useRewardedAd({ rewardKind:'feature', surface:'retry', onRewardEarned })`. On
    reward → clear marker, clear `forfeitedToday`, start the game.
  - `handleStartGame`: if `forfeitedToday` AND native AND ad available → `showAd()` and
    return (the reward callback starts the game). Otherwise (web / no ad) clear the
    marker and start normally — never soft-lock the player.
- Practice mode (`isPractice`) is exempt from the marker and the gate.

### Phase 3 — Copy (all 5 locales)
Reframe the `daily.quitConfirm` / `quitConfirmTitle` / `imSure` strings: progress won't
be saved + watch an ad to play again today. Hebrew included (flag for native review).

## Out of scope / follow-ups
- Changing the `DailyReadyScreen` Start-button label to advertise the ad-gate (relying on
  the quit modal's warning for v1).
- Server-side forfeit tracking (client localStorage only; no streak/leaderboard impact).

## Test plan (TDD)
- RED→GREEN unit tests for the three forfeit storage helpers (mirror `storage.test.ts`).
- Existing `DailyChallenge.test.tsx` suite must stay green.
- `npm run lint` + `build:fast`.
