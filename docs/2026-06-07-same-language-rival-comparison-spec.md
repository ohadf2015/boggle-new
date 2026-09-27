# Same-Language Rival/Leaderboard Comparison — Spec

**Date:** 2026-06-07
**Ask:** "always compare the player in the leaderboard and in the rival push message etc to players that play in his language"

## Problem

Cross-language score comparison is semantically broken — words, dictionaries, and
puzzle difficulty differ per language, so a Hebrew 500 ≠ English 500. The season
system already credits per `(puzzle_date, language)` but the *comparison surfaces*
ignore language entirely:

| Surface | File | Current matching | Has language signal? |
|---|---|---|---|
| Daily push **rival** | `lib/dailyChallengeRivals.ts` | season daily-puzzle score, no lang | YES — `daily_*_attempts.language` |
| **Ghost** weekly rival | `backend/modules/ghostRivalManager.ts` | `profiles.total_score` ±20%, no lang | partial — `profiles.language` (40% null) |
| Season **leaderboard** | RPC `get_leaderboard` / `leaderboard` table | single cross-language `total_score` | NO per-language total materialized |

## Decisions

1. **Daily push rival (PRIMARY, this change).** Match a recipient only to rivals who
   played the daily in the **same gameplay language**, and compute the score gap from
   per-language season aggregates.
   - Gameplay language is read from `daily_puzzle_attempts.language` /
     `daily_word_hunt_attempts.language` (set at play time — reliable).
   - Recipient's language = **dominant** season daily language (argmax of summed
     per-language score); fall back to the recipient's `locale` (already carried on
     the recipient object, no extra fetch); else no rival → general reminder.
   - Rows with **null/missing language** collapse into one `__nolang__` bucket so
     legacy attempts (and all existing tests) still match each other. Filter is a
     no-op where data is absent, active where present.
   - Expected side-effect (correct, not a bug): minority-language players (sv/ja)
     get the general reminder more often. Null-rival fallback already handles this.

2. **Ghost rival (SECONDARY, this change).** Prefer same-`profiles.language`
   candidates, but **fall back** to language-agnostic matching when the same-language
   pool is empty OR the player's own language is null. `profiles.language` is ~40%
   populated → a hard `.eq` would starve the pool. This guarantees "rival plays the
   same language" when known; it does NOT make `total_score` itself comparable
   (it stays cross-language) — a partial, safe improvement.

3. **Main season leaderboard (DEFERRED — data-model change, phase 2).** `get_leaderboard`
   ranks the `leaderboard` table by a single `total_score`; `recompute_current_season_leaderboard`
   SUMS hunt+wheel+MP across ALL languages into that one number. No per-(player,language)
   season total exists anywhere. A same-language leaderboard requires: a new
   per-language total (column or table) + recompute rewrite + RPC `p_language` param +
   client wiring. Genuine wall — out of scope for this change; flagged so it is not lost.

4. **Connections daily leaderboard (DEFERRED — cheap, not data-model).** `connections_daily_scores.language`
   ALREADY exists; the route just doesn't `.eq('language', …)`. A one-line filter, but it
   needs the viewer's language plumbed into the route + confirming whether connections
   puzzles are per-language or shared. Deferred for scope, NOT because it's hard.

## Live-data verification (2026-06-07)
- `daily_word_hunt_attempts` (last 35d): 211 rows, **100% language-populated**, codes
  `[en,es,he,ja,sv]` — same vocabulary as the locale fallback. ✓ consistent, no bucket split.
- `daily_puzzle_attempts` (last 35d): **0 rows** — the puzzle daily is dormant; word-hunt is
  the active daily. Consequence: `dominantLanguage()` (derived from the puzzle aggregate)
  returns null in practice, so the **locale fallback path carries production** — recipients
  match to same-language word-hunt completers. Feature is live-correct, not a no-op.
- `profiles.language`: 32/81 non-null (~40%) → ghost-rival uses preference-with-fallback.

## TDD

- `lib/__tests__/dailyChallengeRivals.test.ts`: add cases — excludes different-language
  rival; prefers same-language rival over a closer different-language one; gap computed
  within recipient language; dominant-language selection; locale fallback when no season
  attempts; backward-compat (no-language rows still match — covered by existing suite).
- `backend/modules/__tests__/ghostRivalManager.test.ts`: prefers same-language candidate;
  falls back to language-agnostic when same-language pool empty; no filter when player
  language null.

## Non-goals
Main season leaderboard UI (phase-2 data work), leagues + word-tower (no language column;
phase-2), custom-puzzle leaderboard (per-puzzle-code, single language by construction).
