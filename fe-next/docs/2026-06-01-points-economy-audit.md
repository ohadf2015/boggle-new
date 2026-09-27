# Points / Season / Leaderboard Economy — Audit & Fix Spec

Date: 2026-06-01

## Goal (user requirements)
1. **Most leaderboard/season points must come from the Daily Challenge**, not other modes.
2. **Feature-gated modes must NOT award XP or affect the leaderboard.**
3. Audit the whole economy; migrate only if needed.

## How the economy actually works (verified)
- "General leaderboard" + "season leaderboard" = `profiles.total_score`, projected into the
  `leaderboard` table by trigger `sync_profile_to_leaderboard` (season-aware via
  `get_current_season_id()`), ranked by trigger `update_leaderboard_ranks`
  (`ORDER BY total_score DESC, games_played DESC`). The headline number players see = `total_score`.
- Season score = lifetime total − prior-season finals + 10% carry (derived each write).
- XP (`profiles.total_xp`, level) is a **separate progression track** — NOT the competitive sort key.
- Three award chokepoints write `total_score`:
  - **MP** → `backend/modules/supabase/gameProcessing.ts` `processPlayerResult` →
    `updatePlayerStats` (`playerStats.ts:214` `total_score += gameStats.score`) + `updateLeaderboardEntry`.
  - **SP / Daily** → `app/api/stats/record-game/route.ts` (`total_score += score` L121, XP L164).
  - **Blast solo** → `app/api/blast/result/route.ts` (`total_score += score` L167, XP L191).
  - **Daily Word Hunt also** → `backend/routes/dailyChallenge/wordHuntRoutes.ts` submit
    (`updateDailyProfileStats`, validated + idempotent via `UNIQUE(puzzle_date,language,player_id)`).

## Findings / gaps
- **Gap 0 — no per-mode ledger + 86% of points untraceable.** `record-game` writes `total_score`
  but never inserts `game_results`. `game_results` sums to 83k pts; lifetime `total_score` ≈ 600k.
- **Gap 0b — Daily DOUBLE-COUNTS.** Completion fires two fire-and-forget POSTs (`record-game` AND
  `word-hunt/submit`); both increment `total_score`, `total_games`, `unique_days_played`.
- **Gap 1 — Daily not dominant.** Daily posts its raw `efficiencyScore` like any casual game; no weight.
- **Gap 2 — gated modes award.** `word-tower` (admin-gated at START only) + `shiritori` flow through
  `recordGameResultsToSupabase` with no result-time gate → full `total_score` + XP. Live pollution ≈ 0
  (preventive). Source of truth for gating: `GAME_MODE_WEIGHTS` (weight 0 ⇒ gated) in `gameModeSelector.ts`.
- **Gap 3 (balance note, out of scope) — Blast underfunded:** 10 avg pts/game vs classic 116.
- **Anomaly — phantom/test accounts top the all-time board** (Eden 144k, Ron 127k, אוהד-test 140k,
  ~0 traceable games).

## Fix design (forward-only, app-layer, no schema migration)
Single pure policy module `backend/modules/leaderboardScoring.ts`:
- `isGatedMode(mode)` — true iff `GAME_MODE_WEIGHTS[mode] === 0` (derives from existing source).
- `isDailyMode(mode)` — `'daily' | 'daily-challenge'`.
- `leaderboardPointsForGame(mode, rawScore)` — gated→0; daily→`round(raw×DAILY_LEADERBOARD_WEIGHT)`;
  else→`round(raw×CASUAL_LEADERBOARD_WEIGHT)`.
- Tunable: `DAILY_LEADERBOARD_WEIGHT = 3`, `CASUAL_LEADERBOARD_WEIGHT = 0.25`.

### Phase 1 — Req B: gate feature-gated modes (no migration)
- MP `processPlayerResult`: if `isGatedMode(gameInfo.gameMode)` → skip `updatePlayerStats` (total_score+XP),
  `updateLeaderboardEntry`, `updateRankedProgress`. Still `recordGameResult` (history) + `logGameSession`.
- `record-game` + `blast/result`: defense-in-depth guard — skip `total_score`+XP if gated.

### Phase 2 — Req A: daily dominates + fix double-count (no migration)
- Down-weight casual `total_score`: MP (`updatePlayerStats` via threaded `gameMode`), SP (`record-game`),
  blast — credit `leaderboardPointsForGame(mode, score)` to `total_score`; keep raw score in `game_results`.
  **XP unchanged** (progression not punished).
- Daily owner split (kill double-count): `record-game` for daily keeps XP/quests/achievements but adds **0**
  to `total_score`; `word-hunt/submit` owns the weighted daily leaderboard points (validated, once/day).
  Remove overlapping `total_games`/`unique_days` double-increment.
- (Optional, additive) `record-game` inserts a `game_results` row (mode `daily`/SP) for auditability.

## Recommendations — NOT auto-run (user decision; irreversible / product)
- **Season reset** (`process_season_reset`) to realize a daily-dominated board from a clean baseline.
  Forward-only weighting leaves the current board casual/phantom-heavy until reset.
- **Exclude phantom/test accounts** (Eden, Ron, אוהד-test) from the public leaderboard.
- **Tune** `DAILY_/CASUAL_LEADERBOARD_WEIGHT` to taste (set casual→0 for daily-only).
- **Blast scoring rebalance** (Gap 3).
