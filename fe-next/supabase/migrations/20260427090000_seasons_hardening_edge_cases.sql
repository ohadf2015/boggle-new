-- Hardening pass for the seasons RPCs.
-- Fixes 4 critical edge cases discovered during audit (see migration body
-- in Supabase migrations log entry "seasons_hardening_edge_cases").
-- Mirrors the live deployment so file-based and applied state stay in sync.

BEGIN;

-- (a) Claim exploit fix: require matching season_peak_tier entry
CREATE OR REPLACE FUNCTION claim_season_rewards(
  p_player_id UUID, p_season_id INTEGER, p_coins INTEGER, p_badges TEXT[]
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_entry_exists BOOLEAN; v_already_claimed BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM profiles p, jsonb_array_elements(COALESCE(p.season_peak_tier, '[]'::jsonb)) e
    WHERE p.id = p_player_id AND (e->>'seasonId')::int = p_season_id
  ) INTO v_entry_exists;
  IF NOT v_entry_exists THEN RETURN FALSE; END IF;

  SELECT EXISTS (
    SELECT 1 FROM profiles p, jsonb_array_elements(COALESCE(p.season_peak_tier, '[]'::jsonb)) e
    WHERE p.id = p_player_id AND (e->>'seasonId')::int = p_season_id
      AND e->>'claimedAt' IS NOT NULL AND e->>'claimedAt' <> 'null'
  ) INTO v_already_claimed;
  IF v_already_claimed THEN RETURN FALSE; END IF;

  UPDATE player_progression
  SET gold = COALESCE(gold, 0) + p_coins, updated_at = now()
  WHERE user_id = p_player_id;

  UPDATE profiles SET season_peak_tier = (
    SELECT jsonb_agg(
      CASE WHEN (e->>'seasonId')::int = p_season_id
           THEN jsonb_set(e, '{claimedAt}', to_jsonb(now()::text))
           ELSE e END)
    FROM jsonb_array_elements(COALESCE(season_peak_tier, '[]'::jsonb)) e)
  WHERE id = p_player_id;

  IF p_badges IS NOT NULL AND array_length(p_badges, 1) > 0 THEN
    INSERT INTO player_inventory (user_id, item_id, item_type, category, rarity, quantity, earned_at)
    SELECT p_player_id, b, 'badge', 'badge', 'rare', 1, now()
    FROM unnest(p_badges) AS b
    ON CONFLICT (user_id, item_id) DO NOTHING;
  END IF;
  RETURN TRUE;
END $$;

-- (b)(c)(d) process_season_reset: race-safe + advisory lock + auto-create next
CREATE OR REPLACE FUNCTION process_season_reset(p_season_id INTEGER)
RETURNS TABLE(snapshotted INTEGER, reset_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_snap_count INTEGER := 0;
  v_reset_count INTEGER := 0;
  v_next_id INTEGER := p_season_id + 1;
  v_start TIMESTAMPTZ; v_end TIMESTAMPTZ;
BEGIN
  PERFORM pg_advisory_xact_lock(96120, p_season_id);

  IF NOT EXISTS (SELECT 1 FROM seasons WHERE id = v_next_id) THEN
    SELECT end_date INTO v_start FROM seasons WHERE id = p_season_id;
    IF v_start IS NULL THEN v_start := date_trunc('month', now())::timestamptz; END IF;
    v_end := (v_start + interval '1 month');
    INSERT INTO seasons (id, name, theme, start_date, end_date, status)
    VALUES (v_next_id, format('Season %s', v_next_id), 'Word Warriors', v_start, v_end, 'active')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  WITH ranked AS (
    SELECT lb.player_id, lb.username,
      COALESCE(lb.total_score, 0) AS total_score,
      COALESCE(lb.games_played, 0) AS games_played,
      COALESCE(lb.games_won, 0) AS games_won,
      lb.ranked_mmr,
      ROW_NUMBER() OVER (ORDER BY COALESCE(lb.total_score, 0) DESC, COALESCE(lb.games_won, 0) DESC) AS rank_position,
      CASE WHEN COALESCE(lb.ranked_mmr, 0) >= 2800 THEN 'Grandmaster'
           WHEN COALESCE(lb.ranked_mmr, 0) >= 2400 THEN 'Master'
           WHEN COALESCE(lb.ranked_mmr, 0) >= 2000 THEN 'Diamond'
           WHEN COALESCE(lb.ranked_mmr, 0) >= 1600 THEN 'Platinum'
           WHEN COALESCE(lb.ranked_mmr, 0) >= 1200 THEN 'Gold'
           WHEN COALESCE(lb.ranked_mmr, 0) >= 800  THEN 'Silver'
           ELSE 'Bronze' END AS peak_tier
    FROM leaderboard lb WHERE lb.season_id = p_season_id)
  INSERT INTO season_leaderboards
    (season_id, player_id, username, total_score, games_played, games_won, ranked_mmr, rank_position, peak_tier)
  SELECT p_season_id, player_id, username, total_score, games_played, games_won, ranked_mmr, rank_position, peak_tier
  FROM ranked
  ON CONFLICT (season_id, player_id) DO NOTHING;
  GET DIAGNOSTICS v_snap_count = ROW_COUNT;

  UPDATE profiles p
  SET season_peak_tier = COALESCE(p.season_peak_tier, '[]'::jsonb)
    || jsonb_build_array(jsonb_build_object(
      'seasonId', sl.season_id, 'tier', sl.peak_tier,
      'rankPosition', sl.rank_position, 'claimedAt', NULL))
  FROM season_leaderboards sl
  WHERE sl.season_id = p_season_id AND sl.player_id = p.id
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(p.season_peak_tier, '[]'::jsonb)) e
      WHERE (e->>'seasonId')::int = sl.season_id);

  -- Race-safe: drop stale season-N rows for players who already have N+1
  DELETE FROM leaderboard old_lb
  WHERE old_lb.season_id = p_season_id
    AND EXISTS (SELECT 1 FROM leaderboard new_lb
                WHERE new_lb.player_id = old_lb.player_id AND new_lb.season_id = v_next_id);

  UPDATE leaderboard
  SET season_id = v_next_id,
      ranked_mmr = GREATEST(800, FLOOR(COALESCE(ranked_mmr, 1000) * 0.75) + 250),
      total_score = 0, games_played = 0, games_won = 0,
      last_updated = now()
  WHERE season_id = p_season_id;
  GET DIAGNOSTICS v_reset_count = ROW_COUNT;

  UPDATE seasons SET status = 'closed' WHERE id = p_season_id;
  RETURN QUERY SELECT v_snap_count, v_reset_count;
END $$;

-- Lock down SECURITY DEFINER grants. Postgres defaults grant EXECUTE to
-- PUBLIC; revoke that and grant explicitly so anon callers can't reach
-- the RPCs.
REVOKE EXECUTE ON FUNCTION process_season_reset(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION process_season_reset(INTEGER) TO service_role;

REVOKE EXECUTE ON FUNCTION claim_season_rewards(UUID, INTEGER, INTEGER, TEXT[]) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION claim_season_rewards(UUID, INTEGER, INTEGER, TEXT[]) TO authenticated, service_role;

COMMIT;
