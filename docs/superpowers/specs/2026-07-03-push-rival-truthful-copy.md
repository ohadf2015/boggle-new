# Push Rival Reminder — Truthful Event-Based Copy + Russian Locale

**Date:** 2026-07-03
**Goal:** Push notifications send wrong data ("you're tied with X" when the user
clearly leads the daily challenge this season) and skip Russian. Make every push
truthful and attractive across all 6 locales.

## Root cause (data-proven)

The rival-aware daily-challenge push (`lib/rivalReminderCopy.ts` +
`lib/dailyChallengeRivals.ts`) computes each player's "season score" as the
sum of **`daily_puzzle_attempts.score`** over the season window.

Measured on prod (2026-07-03):
- `daily_puzzle_attempts` (score>0), last 30d: **0 rows, 0 players** — the daily
  puzzle mode is dead.
- `daily_word_hunt_attempts` (solved), last 30d: **309 rows, 18 players** — Word
  Hunt is the live daily.
- `daily_word_hunt_attempts` has **no additive `score` column** (only `solved`,
  `efficiency_score`, `attempts_used`); its leaderboard is a per-day *ordering*,
  not season points.

Therefore every recipient AND every rival resolves to season score **0**, so
`gap = |0 − 0| = 0` → `isTied === true` for **100%** of rival pushes. The copy
always says "tied," `{gap}`/`{rivalScore}` always render 0. Class 3 (asymmetric
paths): the completer pool is fed by Word Hunt, but the comparison metric reads
a dead puzzle table.

### Why not "just use total_score"

`leaderboard.total_score` IS a season projection (Word Hunt daily ×3 +
multiplayer ×0.25, migration `20260602120000_season_score_from_events`), but the
daily share is permanently ≤0.2% (max ~3 pts/day vs ~900/multiplayer game). A
`total_score` gap in a *daily-challenge* push is a multiplayer number wearing a
daily label — the same misrepresentation as the tie, and it re-opens a false-tie
surface (equal scores). No trustworthy per-player "daily season points" number
exists for the mode people play.

## Fix — event-based framing (drop the fabricated comparison)

The only facts reliably true for every segment:
1. The rival **cleared today's daily** (Word Hunt).
2. The recipient **hasn't played today** (they're in the reminder set).
3. The clock resets at local midnight.

Reframe copy to those facts. Delete the `scoreGap` / `rivalScore` / `rankDelta`
/ `direction` / `isTied` plumbing in BOTH the selection (`dailyChallengeRivals`)
and copy (`rivalReminderCopy` + `rivalReminderTemplates`) layers.

Example: *"Maya just cleared today's Word Hunt — your turn before midnight."*

Keep: per-locale template variants, urgency tiers (morning/midday/urgent),
multi-rival social proof (`+N more cleared today`), Hebrew bidi wrap, generic
rival-noun fallback, `{mode}` label. Templates use only `{rival}`, `{mode}`,
`{hoursLeft}`.

### Selection simplification (`findDailyChallengeRivals`)

- Delete Wave 3 (season puzzle aggregate), caps, closest-by-score, direction.
- Rival = a same-language player (≠ recipient) who cleared today's daily.
  Prefer the one nearest by `leaderboard.rank_position` when both ranks exist
  (stable, unique); else deterministic pick.
- Recipient language: dominant Word Hunt language this season, else carried UI
  locale.
- `additionalCount` = other same-language completers − 1.
- `RivalCandidate` shrinks to `{ username, avatarImage, mode, additionalCount }`.

## Russian locale (6th language, was missing everywhere)

Add `ru` to `PushLocale` + `SUPPORTED_PUSH_LOCALES` + `COUNTRY_LOCALE_MAP`
(RU/BY/KZ) and fill the `ru` branch of every `Record<PushLocale,…>`:
`pushTranslations.STRINGS`, `dailyReminderTemplates`, `rivalReminderTemplates`,
`pushDisplayName.RIVAL_GENERIC`, `rivalReminderCopy.URGENCY_SUFFIX` +
`MODE_LABEL`. Compiler enforces exhaustiveness.

## Attractiveness pass

Author native, non-literal copy (fe-next:ux-writer discipline) for the new
event templates across all 6 locales; sanity-scan the other live triggers'
composed output for truthfulness.

## Tests (TDD, contract change)

- RED: "recipient who leads, rival cleared today → copy never says tied, states
  the event, mentions rival + resets-at-midnight." Fails on current code.
- Rewrite `rivalReminderCopy.test.ts` to the new contract (no direction/gap/tied).
- `pushTranslations.test.ts`: assert all 6 locales present for every key.
- Keep Hebrew naturalness guards; add `ru` coverage.

## Callers to update (shared-function fix)

`backend/services/dailyChallengeReminder.ts` and
`app/api/cron/daily-challenge-reminders/route.ts` — both call
`pickRivalReminderCopy` with the old arg shape; update to the new one.
