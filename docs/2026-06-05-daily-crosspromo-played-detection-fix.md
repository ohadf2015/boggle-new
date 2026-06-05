# Daily cross-promo: server-of-record played detection

**Date:** 2026-06-05
**Type:** bug fix

## Symptom
On the Word Wheel daily results screen, a player who had **already completed
today's Word Hunt** still saw the green "Finish today's challenge → play Word
Hunt" CTA, instead of the "Back to Daily Hub → see today's leaderboard" card
(which links to `/[locale]/daily`, the daily challenge main page). Reported with
an all-Hebrew screenshot.

## Root cause — detection asymmetry (not a key mismatch)
The daily is **per-language** by design (server route is
`/api/daily-challenge/<mode>/check-played/<date>/<language>`), so resolving
completion per-language is correct — a Word Hunt done in English must NOT count
for the Hebrew daily.

The real defect: Word Wheel resolved **its own** completion via localStorage
**+ a server cross-device check** (`WordWheelChallenge` init), but resolved
**Word Hunt** completion via `hasPlayedWordHuntToday(language)` — **localStorage
only**. Any player who completed Word Hunt on another device, or after clearing
cache, has an empty localStorage on the current device, so the cross-promo
nagged them to replay a challenge they already finished. The symmetric bug
existed on the Word Hunt results screen for its Word Wheel CTA.

The Word-Hunt `check-played` endpoint already existed
(`backend/routes/dailyChallenge/wordHuntRoutes.ts`, table
`daily_word_hunt_attempts`, filtered by `puzzle_date` + `language` +
`player_id`/`guest_fingerprint`) — so the fix is small.

## Fix
New shared hook `fe-next/hooks/useDailyModePlayed.ts`:
`useDailyModePlayed(mode, language, identity) → boolean`.
- **Tier 1**: localStorage (lazy-init → no first-paint CTA flash).
- **Tier 2**: server-of-record `check-played` fallback when localStorage is
  empty (cross-device / cache-clear), keyed per-language.
- Focus/visibility refresh is **sticky-true** within (mode, language, day):
  completion only goes false→true, so a later refresh never clobbers a
  server-confirmed `true` when localStorage stayed empty.
- Practice mode → always `false` (never gates).

Wired into both cross-promo gates:
- `components/daily/WordWheelChallenge.tsx` — `hasPlayedWH` (Word Hunt gate),
  replacing the local `useState` + focus-refresh effect + `init()` read.
- `components/daily/WordHuntResultsContent.tsx` — `wordWheelPlayed`, replacing
  the lazy-`useState` + focus-refresh effect. (Connections cross-promo left as
  localStorage-only — separate daily system, out of scope.)

## Tests
- `hooks/__tests__/useDailyModePlayed.test.ts` — 9 cases (local-true short
  circuit, server cross-device resolve, per-mode endpoint routing, guest
  fingerprint + fallback, practice bypass, network-error tolerance).
- Updated the 3 `WordHuntResultsContent` test mocks to export the now-imported
  `hasPlayedWordHuntToday`.
- Full `components/daily` + `hooks` suites green (793 tests), lint + tsc clean.

## Not verified
Live MP/daily results env is socket/login-gated headless, so the cross-device
path was proven by unit test rather than on-device repro.
