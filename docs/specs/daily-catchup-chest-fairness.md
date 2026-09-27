# Daily Catch-up + Chest Fairness + Freeze-Protects-Chest

**Date:** 2026-05-23 · **Status:** in progress

## Problem (from founder)
1. Players who miss a daily can't go back and play it — let them catch up the **last 3** missed dailies.
2. The catch-up mechanism must work end-to-end (submit, score, stats).
3. After finishing today's daily, **suggest** the missed dailies they can still catch up.
4. Chest gold tier is broken — **58% of chests are gold** (DB-verified). Only the *best* players should get gold, not everyone who played 7 days.
5. A streak **freeze** should also freeze the **chest** cycle so a covered missed day doesn't clear it.

## Root causes (DB-verified, 2026-05-23)
- `getChestTier` keys off a self-relative `weekScore`; Word Hunt feeds raw `efficiency_score` (range 0–983, p50 718) into `min(100, raw)` → **every solve pins to 100** → 99% of days clear any ≤100 threshold. Tiers: 58.3% gold / 41.7% silver / 0% bronze.
- Chest continuity is computed server-side purely from `daily_*_attempts` rows. A missed day = missing row = broken cycle. Freeze state is **client-only** (`utils/dailyChallenge/streakFreeze.ts` localStorage) → server chest logic can't see it.
- Submit route (`backend/routes/dailyChallenge/wordHuntRoutes.ts:90`) rejects any `puzzleDate` older than yesterday (clock-drift guard) → no catch-up possible.
- Stats trigger (`migration 020`) sets `last_played_date = NEW.puzzle_date` unconditionally → a catch-up insert for an old date would **regress** last-played.

## Design decisions
- **Catch-up is anti-farm**: counts toward personal stats + daily-streak history, **NOT** toward weekly-chest cycle continuity. (Otherwise the catch-up feature trivially defeats the tightened gold gate.)
- **Catch-up window**: the 3 calendar days before today the player has not completed. Submit accepts `today .. today-3`; rows flagged `is_catchup`.
- **Gold gate** (absolute floor + consistency, no population infra):
  - Normalize Word Hunt to `min(100, efficiency_score/10)` → real 0–100 spread (p50≈72, p90≈90).
  - Per **day**, take the *best* normalized score across modes. `weekScore = avg(dayScores)`, `minDayScore = min(dayScores)`.
  - **Gold**: `weekScore ≥ 82 AND minDayScore ≥ 55`. **Silver**: `weekScore ≥ 50`. **Bronze**: else.
- **Freeze protects chest**: new server table `daily_streak_freezes(player_id, frozen_date, UNIQUE)`. Recorded when a daily freeze is consumed. Chest status unions frozen dates into continuity, but they carry **no score row** so they never inflate tier.

## Phases (per-phase commit; ask before commit)
1. **Chest tier tightening** — pure logic in `lib/daily/weeklyChest.ts` + tests. Independent, lowest risk.
2. **Catch-up** — DB: `is_catchup` column + trigger `GREATEST(last_played_date, NEW.puzzle_date)`; backend: widen submit window, flag catch-up, exclude catch-up dates from chest continuity; client: post-results "catch up missed dailies" suggestion that launches a past-date daily. Detect missed days via `/api/daily/missed`.
3. **Freeze ledger + chest bridge** — `daily_streak_freezes` table + `POST /api/daily/streak-freeze` (record consumed freeze date); wire `updateDailyStreakWithFreeze` consumer; union frozen dates in chest status continuity.

## Non-goals (v2)
- Playable catch-up entry from the Archive page (post-results suggestion is the only entry point for now).
- Migrating legacy client-only freeze state into the new ledger.
- Population-percentile tiering.
