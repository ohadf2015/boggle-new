-- =============================================
-- RANKED ELO RATING SYSTEM
-- Migration: 20260321000000_add_ranked_ratings
--
-- Adds dedicated player_ratings and ranked_matches tables
-- for proper ELO-based ranked matchmaking.
-- =============================================

-- Player ELO ratings (separate from profiles.ranked_mmr for clean separation)
CREATE TABLE IF NOT EXISTS player_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL DEFAULT 1000,
  rating_deviation INTEGER NOT NULL DEFAULT 350,
  games_played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  peak_rating INTEGER NOT NULL DEFAULT 1000,
  last_game_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Match history for ranked games
CREATE TABLE IF NOT EXISTS ranked_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  winner_id UUID NOT NULL REFERENCES auth.users(id),
  loser_id UUID NOT NULL REFERENCES auth.users(id),
  winner_rating_before INTEGER NOT NULL,
  winner_rating_after INTEGER NOT NULL,
  loser_rating_before INTEGER NOT NULL,
  loser_rating_after INTEGER NOT NULL,
  winner_score INTEGER NOT NULL,
  loser_score INTEGER NOT NULL,
  game_mode TEXT NOT NULL DEFAULT 'classic',
  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE player_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranked_matches ENABLE ROW LEVEL SECURITY;

-- RLS policies for player_ratings
CREATE POLICY "Users can view all ratings"
  ON player_ratings FOR SELECT USING (true);

CREATE POLICY "Users can update own rating"
  ON player_ratings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service can insert ratings"
  ON player_ratings FOR INSERT WITH CHECK (true);

-- RLS policies for ranked_matches
CREATE POLICY "Users can view all matches"
  ON ranked_matches FOR SELECT USING (true);

CREATE POLICY "Service can insert matches"
  ON ranked_matches FOR INSERT WITH CHECK (true);

-- Performance indexes
CREATE INDEX idx_player_ratings_rating ON player_ratings(rating DESC);
CREATE INDEX idx_player_ratings_user_id ON player_ratings(user_id);
CREATE INDEX idx_ranked_matches_played_at ON ranked_matches(played_at DESC);
CREATE INDEX idx_ranked_matches_winner ON ranked_matches(winner_id);
CREATE INDEX idx_ranked_matches_loser ON ranked_matches(loser_id);

-- Function to get or create a player rating row
CREATE OR REPLACE FUNCTION get_or_create_player_rating(p_user_id UUID)
RETURNS player_ratings AS $$
DECLARE
  v_result player_ratings;
BEGIN
  SELECT * INTO v_result FROM player_ratings WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO player_ratings (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING * INTO v_result;

    -- Handle race condition: if INSERT was skipped due to conflict, re-fetch
    IF v_result IS NULL THEN
      SELECT * INTO v_result FROM player_ratings WHERE user_id = p_user_id;
    END IF;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_or_create_player_rating(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_or_create_player_rating(UUID) TO authenticated;
