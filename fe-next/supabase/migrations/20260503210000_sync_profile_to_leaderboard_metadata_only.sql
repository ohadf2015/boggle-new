-- Root-cause fix: cross-season leaderboard score corruption.
--
-- BUG (reported 2026-05-03):
--   Every game / XP grant unifies the player's current-season leaderboard
--   row with prior-season totals. Top players observed at 91k S2 score
--   when their derived season score should be ~14k.
--
-- ROOT CAUSE:
--   `sync_profile_to_leaderboard()` trigger writes
--     leaderboard.total_score = EXCLUDED.total_score (= profiles.total_score, LIFETIME)
--   into the season-scoped leaderboard row. Every UPDATE OF total_score on
--   profiles (game scoring path: backend/modules/supabase/playerStats.ts:214)
--   fires this trigger and clobbers the season-derived value written by
--   updateLeaderboardEntry() (backend/modules/supabase/leaderboard.ts:42)
--   and process_season_reset() (10% soft-carry).
--
-- FIX:
--   1. Trigger now syncs IDENTITY/METADATA only (username, display_name,
--      avatar_*, profile_picture_url). Score & games columns are owned by:
--        - updateLeaderboardEntry()  per-game writer, derives season score
--                                    from season_leaderboards snapshots
--        - process_season_reset()    rollover, applies 10% soft carry
--      Single source of truth for derived values.
--   2. Trigger event mask narrowed: drop total_score / total_games /
--      ranked_wins / ranked_mmr from the OF list. These are derived/score
--      columns; they don't affect identity. Removes ~99% of trigger
--      firings (every game previously fired this).
--   3. Backfill: recompute current-season total_score for every leaderboard
--      row using the same formula updateLeaderboardEntry uses, so the
--      runtime path is idempotent on top of the backfill.
--   4. Embedded regression assertion at end: simulate a profile.total_score
--      bump on a probe row and verify leaderboard.total_score is unchanged.

-- 1) Replace trigger function: metadata-only.
CREATE OR REPLACE FUNCTION public.sync_profile_to_leaderboard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_season_id INTEGER;
BEGIN
  -- Date-windowed; safe across rollover. Falls back to 1 if no active season.
  v_season_id := COALESCE(get_current_season_id(), 1);

  INSERT INTO leaderboard (
    player_id,
    username,
    display_name,
    avatar_emoji,
    avatar_color,
    avatar_image,
    profile_picture_url,
    total_score,
    games_played,
    games_won,
    ranked_mmr,
    season_id,
    last_updated
  ) VALUES (
    NEW.id,
    NEW.username,
    NEW.display_name,
    NEW.avatar_emoji,
    NEW.avatar_color,
    NEW.avatar_image,
    NEW.profile_picture_url,
    0,  -- score owned by updateLeaderboardEntry; insert at zero, runtime fills
    0,
    0,
    COALESCE(NEW.ranked_mmr, 1000),
    v_season_id,
    NOW()
  )
  ON CONFLICT (player_id, season_id) DO UPDATE SET
    username             = EXCLUDED.username,
    display_name         = EXCLUDED.display_name,
    avatar_emoji         = EXCLUDED.avatar_emoji,
    avatar_color         = EXCLUDED.avatar_color,
    avatar_image         = EXCLUDED.avatar_image,
    profile_picture_url  = EXCLUDED.profile_picture_url,
    last_updated         = NOW();
    -- DO NOT TOUCH: total_score, games_played, games_won, ranked_mmr.
    -- Owned by updateLeaderboardEntry() / process_season_reset().

  RETURN NEW;
END;
$function$;

-- 2) Narrow event mask: identity columns only.
DROP TRIGGER IF EXISTS profile_to_leaderboard_sync ON profiles;
CREATE TRIGGER profile_to_leaderboard_sync
  AFTER INSERT OR UPDATE OF
    username, display_name, avatar_emoji, avatar_color,
    avatar_image, profile_picture_url
  ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_to_leaderboard();

-- 3) Backfill: heal existing corruption. Same formula as
--    updateLeaderboardEntry → idempotent with runtime writes.
--    NB: Postgres UPDATE ... FROM cannot reference the target table inside
--    a JOIN, so we precompute (player_id, new_score) in a CTE and join
--    that to the target.
WITH cur AS (
  SELECT COALESCE(get_current_season_id(), 1) AS sid
),
priors AS (
  SELECT
    sl.player_id,
    SUM(sl.total_score)::BIGINT                                            AS sum_priors,
    COALESCE(MAX(sl.total_score) FILTER (
      WHERE sl.season_id = (SELECT sid - 1 FROM cur)
    ), 0)::BIGINT                                                          AS prev_final
  FROM season_leaderboards sl, cur
  WHERE sl.season_id < cur.sid
  GROUP BY sl.player_id
),
target AS (
  SELECT
    p.id AS player_id,
    GREATEST(0,
      COALESCE(p.total_score, 0)::BIGINT
      - COALESCE(pr.sum_priors, 0)
      + FLOOR(0.10 * COALESCE(pr.prev_final, 0))
    )::INTEGER AS new_score
  FROM profiles p
  LEFT JOIN priors pr ON pr.player_id = p.id
)
UPDATE leaderboard l
SET total_score = t.new_score,
    last_updated = NOW()
FROM target t, cur c
WHERE l.player_id = t.player_id
  AND l.season_id = c.sid;

-- 4) Embedded regression assertion. Picks any current-season row, snapshots
--    its leaderboard.total_score, bumps profiles.total_score by +12345,
--    re-reads leaderboard.total_score, asserts unchanged, then rolls back
--    the profile bump. Fails the migration if the trigger still touches
--    score columns.
DO $$
DECLARE
  v_sid           INTEGER := COALESCE(get_current_season_id(), 1);
  v_pid           UUID;
  v_lb_before     INTEGER;
  v_lb_after      INTEGER;
  v_profile_before INTEGER;
BEGIN
  SELECT l.player_id, l.total_score, p.total_score
    INTO v_pid, v_lb_before, v_profile_before
  FROM leaderboard l
  JOIN profiles p ON p.id = l.player_id
  WHERE l.season_id = v_sid
  LIMIT 1;

  IF v_pid IS NULL THEN
    RAISE NOTICE 'No current-season leaderboard rows; skipping trigger assertion.';
    RETURN;
  END IF;

  -- Bump profile.total_score; trigger fires only on identity columns now,
  -- so leaderboard.total_score must NOT change.
  UPDATE profiles SET total_score = COALESCE(total_score, 0) + 12345 WHERE id = v_pid;

  SELECT total_score INTO v_lb_after FROM leaderboard
  WHERE player_id = v_pid AND season_id = v_sid;

  -- Restore profile.
  UPDATE profiles SET total_score = v_profile_before WHERE id = v_pid;

  IF v_lb_after IS DISTINCT FROM v_lb_before THEN
    RAISE EXCEPTION
      'Trigger regression: leaderboard.total_score changed from % to % after profiles.total_score bump (player %). Trigger still touches score columns.',
      v_lb_before, v_lb_after, v_pid;
  END IF;

  RAISE NOTICE 'Trigger assertion passed: leaderboard.total_score (%) unchanged across profiles.total_score bump.', v_lb_before;
END
$$;
