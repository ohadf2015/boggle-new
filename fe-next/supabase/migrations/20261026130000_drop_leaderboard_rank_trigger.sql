-- =============================================
-- Drop the legacy statement-level rank trigger (deadlock fix)
-- Migration: 20261026130000_drop_leaderboard_rank_trigger
--
-- leaderboard_rank_trigger ran update_leaderboard_ranks() AFTER INSERT OR
-- UPDATE OF total_score ON public.leaderboard FOR EACH STATEMENT: every
-- single-row upsert from recompute_current_season_leaderboard rewrote
-- rank_position on ALL ~1,046 leaderboard rows. Concurrent recomputes (one
-- multiplayer round ending fires one recompute per player) lock rows in
-- different orders and deadlock: 2026-10-23 saw 46 of 176 recomputes fail
-- with "deadlock detected" (26%; 39 of them in one real 6-player series).
--
-- The stored rank_position column it maintained is read by NOTHING live:
--   - get_leaderboard, get_user_rank, get_user_current_season_rank and
--     get_user_leaderboard_rank all compute rank at read time
--     (ROW_NUMBER()/RANK() over the caller's season, total_score > 0)
--   - season archival snapshots rank_position with ROW_NUMBER() at archive
--     time into season_leaderboards
-- The trigger also ranked across ALL seasons (no PARTITION BY season_id,
-- join on player_id only), so it would mis-rank the moment a second season
-- has rows.
--
-- The column itself stays (harmless; still in the Drizzle schema) but is no
-- longer maintained — readers must compute rank at read time, as every live
-- code path already does.
-- =============================================

DROP TRIGGER IF EXISTS leaderboard_rank_trigger ON public.leaderboard;
DROP FUNCTION IF EXISTS public.update_leaderboard_ranks();
