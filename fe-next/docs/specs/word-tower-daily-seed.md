# Word Tower — Daily Seed Tower (spec, awaiting greenlight)

**Date:** 2026-05-23 · **Status:** spec only — NOT built (backend decision needed)

The research's #1 retention lever: everyone climbs the **same** Shiritori grid each day →
social comparison + daily-return habit (NYT Spelling Bee model). Whole value depends on a
shared, comparable score, which means a **daily leaderboard** — that's the backend call I
won't guess.

## Two layers

### Layer A — deterministic daily grid (client-only, small)
- `lib/wordTower/dailySeed.ts` (pure): `dailyTowerGameCode(date=new Date())` → `daily-YYYY-MM-DD`
  (UTC); seed everyone identically by also fixing `playerId: 'daily'` so
  `initWordTowerState({ gameCode, playerId: 'daily', language })` yields the same anchor +
  tray sequence for all players that day.
- A **Daily mode** toggle in `WordTowerGame`/`WordTowerPlay`: mounts a fresh daily-seeded
  run (no resume), shows a "Daily · {date}" badge, tracks **today's best** in
  `localStorage['wt-daily-best-YYYY-MM-DD']`, and **gates the progress POST** (the `save`
  useCallback no-ops in daily mode — one line — so it never clobbers the endless save).
- Share card: reuse the existing `/api/word-tower/share` with date + "today's climb".

### Layer B — daily leaderboard (backend — DECISION NEEDED)
The actual social payoff. Options:
1. **New table** `word_tower_daily` (`player_id, date, best_height_m, …`, unique on
   `(player_id, date)`), a `GET ?date=` leaderboard route, and a daily POST. Cleanest.
   ⚠️ Per `.claude/rules/50-supabase-perf.md`: do NOT add it to `supabase_realtime`
   publication unless a consumer subscribes — daily board can be fetch-on-open, no realtime.
2. **Reuse `word_tower_progress`** with a `daily_date` + `daily_best_m` column — lighter
   migration, but mixes endless + daily semantics on one row.

## Open decisions (need your input)
- **Attempts/day**: one scored attempt (classic daily puzzle) or unlimited replays, best
  counts? Daily puzzles are usually 1 serious go.
- **Backend option 1 vs 2** above.
- **Hazards in daily?** Deterministic hazards are fair on a shared seed; or daily is a
  "pure climb" with no hazards for cleaner comparison.

## Recommendation
Ship **Layer A** first (client-only, ~1 day, real value: shared grid + local best + share),
then **Layer B** once you pick the table + attempts model. I'll build Layer A on greenlight.
