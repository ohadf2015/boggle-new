-- Seasons infrastructure: season metadata table, archive table for past
-- season leaderboards, and atomic snapshot+reset / claim RPCs.
--
-- Real `leaderboard` table has PK on `id` (uuid) and UNIQUE on `player_id`.
-- We swap the player-only UNIQUE for a composite UNIQUE on
-- (player_id, season_id) so each player can have one row per season.
--
-- Backfill: every existing leaderboard row gets season_id = 1
-- (Q1+April 2026 grandfathered window). New seasons begin 2026-05-01.

BEGIN;

-- ── seasons table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seasons (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  theme TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO seasons (id, name, theme, start_date, end_date, status)
VALUES (
  1,
  'Season 1: Word Warriors',
  'Word Warriors',
  '2026-01-01T00:00:00Z',
  '2026-05-01T00:00:00Z',
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- ── season_leaderboards archive ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS season_leaderboards (
  id BIGSERIAL PRIMARY KEY,
  season_id INTEGER NOT NULL REFERENCES seasons(id),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,
  ranked_mmr INTEGER,
  rank_position INTEGER NOT NULL,
  peak_tier TEXT,
  archived_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(season_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_season_lb_rank
  ON season_leaderboards(season_id, rank_position);

CREATE INDEX IF NOT EXISTS idx_season_lb_player
  ON season_leaderboards(player_id, season_id);

ALTER TABLE season_leaderboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY season_leaderboards_select_all
  ON season_leaderboards FOR SELECT
  USING (true);

-- ── leaderboard.season_id + composite UNIQUE on (player_id, season_id) ─
ALTER TABLE leaderboard
  ADD COLUMN IF NOT EXISTS season_id INTEGER NOT NULL DEFAULT 1
    REFERENCES seasons(id);

-- Drop the existing player-only UNIQUE if present, replace with composite.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.leaderboard'::regclass
      AND conname = 'leaderboard_player_id_key'
  ) THEN
    ALTER TABLE leaderboard DROP CONSTRAINT leaderboard_player_id_key;
  END IF;
END $$;

ALTER TABLE leaderboard
  DROP CONSTRAINT IF EXISTS leaderboard_player_id_season_id_key;

ALTER TABLE leaderboard
  ADD CONSTRAINT leaderboard_player_id_season_id_key
  UNIQUE (player_id, season_id);

CREATE INDEX IF NOT EXISTS idx_lb_season_score
  ON leaderboard(season_id, total_score DESC);

-- ── normalize profiles.season_peak_tier from {} default to [] ──────────
UPDATE profiles
SET season_peak_tier = '[]'::jsonb
WHERE season_peak_tier IS NULL
   OR jsonb_typeof(season_peak_tier) <> 'array';

ALTER TABLE profiles
  ALTER COLUMN season_peak_tier SET DEFAULT '[]'::jsonb;

-- ── process_season_reset(season_id) ────────────────────────────────────
-- Atomic: snapshot → archive → append peak tier → soft MMR + hard score
-- → close season.
CREATE OR REPLACE FUNCTION process_season_reset(p_season_id INTEGER)
RETURNS TABLE(snapshotted INTEGER, reset_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snap_count INTEGER := 0;
  v_reset_count INTEGER := 0;
  v_next_id INTEGER := p_season_id + 1;
BEGIN
  -- Phase 1: archive snapshot
  WITH ranked AS (
    SELECT
      lb.player_id,
      lb.username,
      COALESCE(lb.total_score, 0) AS total_score,
      COALESCE(lb.games_played, 0) AS games_played,
      COALESCE(lb.games_won, 0) AS games_won,
      lb.ranked_mmr,
      ROW_NUMBER() OVER (
        ORDER BY COALESCE(lb.total_score, 0) DESC,
                 COALESCE(lb.games_won, 0) DESC
      ) AS rank_position,
      CASE
        WHEN COALESCE(lb.ranked_mmr, 0) >= 2800 THEN 'Grandmaster'
        WHEN COALESCE(lb.ranked_mmr, 0) >= 2400 THEN 'Master'
        WHEN COALESCE(lb.ranked_mmr, 0) >= 2000 THEN 'Diamond'
        WHEN COALESCE(lb.ranked_mmr, 0) >= 1600 THEN 'Platinum'
        WHEN COALESCE(lb.ranked_mmr, 0) >= 1200 THEN 'Gold'
        WHEN COALESCE(lb.ranked_mmr, 0) >= 800  THEN 'Silver'
        ELSE 'Bronze'
      END AS peak_tier
    FROM leaderboard lb
    WHERE lb.season_id = p_season_id
  )
  INSERT INTO season_leaderboards
    (season_id, player_id, username, total_score, games_played,
     games_won, ranked_mmr, rank_position, peak_tier)
  SELECT
    p_season_id, player_id, username, total_score, games_played,
    games_won, ranked_mmr, rank_position, peak_tier
  FROM ranked
  ON CONFLICT (season_id, player_id) DO NOTHING;

  GET DIAGNOSTICS v_snap_count = ROW_COUNT;

  -- Phase 2: append peak tier into profiles.season_peak_tier (idempotent)
  UPDATE profiles p
  SET season_peak_tier = COALESCE(p.season_peak_tier, '[]'::jsonb)
    || jsonb_build_array(jsonb_build_object(
      'seasonId', sl.season_id,
      'tier', sl.peak_tier,
      'rankPosition', sl.rank_position,
      'claimedAt', NULL
    ))
  FROM season_leaderboards sl
  WHERE sl.season_id = p_season_id
    AND sl.player_id = p.id
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(p.season_peak_tier, '[]'::jsonb)) e
      WHERE (e->>'seasonId')::int = sl.season_id
    );

  -- Phase 3: soft MMR reset, hard casual reset, bump season
  UPDATE leaderboard
  SET season_id   = v_next_id,
      ranked_mmr  = GREATEST(800, FLOOR(COALESCE(ranked_mmr, 1000) * 0.75) + 250),
      total_score = 0,
      games_played = 0,
      games_won   = 0,
      last_updated = now()
  WHERE season_id = p_season_id;

  GET DIAGNOSTICS v_reset_count = ROW_COUNT;

  -- Phase 4: close season
  UPDATE seasons SET status = 'closed' WHERE id = p_season_id;

  RETURN QUERY SELECT v_snap_count, v_reset_count;
END;
$$;

-- ── claim_season_rewards(player, season, coins, badges) ────────────────
-- Idempotent: returns FALSE if already claimed (claimedAt is set).
CREATE OR REPLACE FUNCTION claim_season_rewards(
  p_player_id UUID,
  p_season_id INTEGER,
  p_coins INTEGER,
  p_badges TEXT[]
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_claimed BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM profiles p,
         jsonb_array_elements(COALESCE(p.season_peak_tier, '[]'::jsonb)) e
    WHERE p.id = p_player_id
      AND (e->>'seasonId')::int = p_season_id
      AND e->>'claimedAt' IS NOT NULL
      AND e->>'claimedAt' <> 'null'
  ) INTO v_already_claimed;

  IF v_already_claimed THEN
    RETURN FALSE;
  END IF;

  -- Award coins via canonical economy column
  UPDATE player_progression
  SET gold = COALESCE(gold, 0) + p_coins,
      updated_at = now()
  WHERE user_id = p_player_id;

  -- Mark claimedAt timestamp on the matching season entry
  UPDATE profiles
  SET season_peak_tier = (
    SELECT jsonb_agg(
      CASE
        WHEN (e->>'seasonId')::int = p_season_id
          THEN jsonb_set(e, '{claimedAt}', to_jsonb(now()::text))
        ELSE e
      END
    )
    FROM jsonb_array_elements(COALESCE(season_peak_tier, '[]'::jsonb)) e
  )
  WHERE id = p_player_id;

  -- Badges into player_inventory; idempotent via (user_id, item_id) UNIQUE
  IF p_badges IS NOT NULL AND array_length(p_badges, 1) > 0 THEN
    INSERT INTO player_inventory
      (user_id, item_id, item_type, category, rarity, quantity, earned_at)
    SELECT
      p_player_id, b, 'badge', 'badge', 'rare', 1, now()
    FROM unnest(p_badges) AS b
    ON CONFLICT (user_id, item_id) DO NOTHING;
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION process_season_reset(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION claim_season_rewards(UUID, INTEGER, INTEGER, TEXT[])
  TO service_role, authenticated;

COMMIT;
