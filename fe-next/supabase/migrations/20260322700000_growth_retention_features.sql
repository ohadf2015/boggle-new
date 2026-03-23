-- =============================================
-- GROWTH & RETENTION FEATURES
-- Migration: 20260322700000_growth_retention_features
--
-- New tables for: async board challenges, word clubs,
-- player recaps, churn prediction signals, difficulty tracking
-- =============================================

-- ==================== ASYNC BOARD CHALLENGES ====================
-- Let players challenge friends to beat their score on the same board
CREATE TABLE IF NOT EXISTS async_board_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenged_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_mode TEXT NOT NULL DEFAULT 'classic' CHECK (game_mode IN ('classic', 'blast', 'word-hunt')),
  letter_grid JSONB NOT NULL,
  grid_size INTEGER NOT NULL DEFAULT 4,
  challenger_score INTEGER NOT NULL DEFAULT 0,
  challenger_words JSONB NOT NULL DEFAULT '[]',
  challenger_best_word TEXT,
  challenged_score INTEGER,
  challenged_words JSONB DEFAULT '[]',
  challenged_best_word TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'expired', 'declined')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  played_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  CONSTRAINT different_players CHECK (challenger_id != challenged_id)
);

-- ==================== WORD CLUBS ====================
-- Small group leaderboards (5-10 members) for social retention
CREATE TABLE IF NOT EXISTS word_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_members INTEGER NOT NULL DEFAULT 10 CHECK (max_members BETWEEN 3 AND 15),
  invite_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(4), 'hex'),
  is_public BOOLEAN NOT NULL DEFAULT false,
  weekly_xp_total INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS word_club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES word_clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weekly_xp INTEGER NOT NULL DEFAULT 0,
  total_xp INTEGER NOT NULL DEFAULT 0,
  games_this_week INTEGER NOT NULL DEFAULT 0,
  best_word_this_week TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (club_id, user_id)
);

-- ==================== PLAYER RECAPS ====================
-- Monthly/weekly stat snapshots for shareable recap cards
CREATE TABLE IF NOT EXISTS player_recaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_games INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  total_words INTEGER NOT NULL DEFAULT 0,
  longest_word TEXT,
  rarest_word TEXT,
  best_score INTEGER NOT NULL DEFAULT 0,
  best_combo INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  rank_change INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,
  favorite_mode TEXT,
  unique_words_found INTEGER NOT NULL DEFAULT 0,
  improvement_percent NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, period_type, period_start)
);

-- ==================== CHURN PREDICTION SIGNALS ====================
-- Track behavioral signals that predict player churn
CREATE TABLE IF NOT EXISTS churn_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  avg_session_length_seconds INTEGER,
  games_per_session NUMERIC(5,2),
  notification_dismissals INTEGER NOT NULL DEFAULT 0,
  streak_freeze_used BOOLEAN NOT NULL DEFAULT false,
  social_interactions INTEGER NOT NULL DEFAULT 0,
  score_trend NUMERIC(5,2) DEFAULT 0,
  days_since_improvement INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  intervention_sent BOOLEAN NOT NULL DEFAULT false,
  intervention_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, signal_date)
);

-- ==================== DYNAMIC DIFFICULTY ====================
-- Track win rates for difficulty adjustment targeting 55-65%
CREATE TABLE IF NOT EXISTS difficulty_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_mode TEXT NOT NULL DEFAULT 'classic',
  recent_wins INTEGER NOT NULL DEFAULT 0,
  recent_games INTEGER NOT NULL DEFAULT 0,
  win_rate NUMERIC(5,4) DEFAULT 0.5,
  difficulty_offset INTEGER NOT NULL DEFAULT 0 CHECK (difficulty_offset BETWEEN -3 AND 3),
  last_adjustment_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, game_mode)
);

-- ==================== RE-ENGAGEMENT SEQUENCES ====================
-- Track tiered re-engagement notification sequences for lapsed players
CREATE TABLE IF NOT EXISTS reengagement_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  days_lapsed INTEGER NOT NULL DEFAULT 0,
  current_tier INTEGER NOT NULL DEFAULT 0 CHECK (current_tier BETWEEN 0 AND 5),
  last_notification_at TIMESTAMPTZ,
  last_notification_type TEXT,
  notifications_sent INTEGER NOT NULL DEFAULT 0,
  reopened BOOLEAN NOT NULL DEFAULT false,
  reopened_at TIMESTAMPTZ,
  opted_out BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- ==================== INDEXES ====================

-- Async challenges
CREATE INDEX idx_async_challenges_challenger ON async_board_challenges(challenger_id);
CREATE INDEX idx_async_challenges_challenged ON async_board_challenges(challenged_id);
CREATE INDEX idx_async_challenges_status ON async_board_challenges(status);
CREATE INDEX idx_async_challenges_expires ON async_board_challenges(expires_at) WHERE status = 'pending';

-- Word clubs
CREATE INDEX idx_word_clubs_owner ON word_clubs(owner_id);
CREATE INDEX idx_word_clubs_invite_code ON word_clubs(invite_code);
CREATE INDEX idx_word_club_members_user ON word_club_members(user_id);
CREATE INDEX idx_word_club_members_club ON word_club_members(club_id);
CREATE INDEX idx_word_club_members_weekly_xp ON word_club_members(club_id, weekly_xp DESC);

-- Player recaps
CREATE INDEX idx_player_recaps_user ON player_recaps(user_id);
CREATE INDEX idx_player_recaps_period ON player_recaps(user_id, period_type, period_start DESC);

-- Churn signals
CREATE INDEX idx_churn_signals_user ON churn_signals(user_id);
CREATE INDEX idx_churn_signals_risk ON churn_signals(risk_level) WHERE risk_level IN ('high', 'critical');
CREATE INDEX idx_churn_signals_date ON churn_signals(signal_date DESC);

-- Difficulty tracking
CREATE INDEX idx_difficulty_tracking_user ON difficulty_tracking(user_id);

-- Re-engagement
CREATE INDEX idx_reengagement_user ON reengagement_sequences(user_id);
CREATE INDEX idx_reengagement_lapsed ON reengagement_sequences(days_lapsed) WHERE opted_out = false;

-- ==================== RLS POLICIES ====================

ALTER TABLE async_board_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_recaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE churn_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE difficulty_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE reengagement_sequences ENABLE ROW LEVEL SECURITY;

-- Async challenges: users can see their own (sent or received)
CREATE POLICY "Users can view own async challenges"
  ON async_board_challenges FOR SELECT
  USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

CREATE POLICY "Users can create async challenges"
  ON async_board_challenges FOR INSERT
  WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Challenged user can update challenge"
  ON async_board_challenges FOR UPDATE
  USING (auth.uid() = challenged_id OR auth.uid() = challenger_id);

-- Word clubs: public readable, members can interact
CREATE POLICY "Word clubs are viewable by everyone"
  ON word_clubs FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create clubs"
  ON word_clubs FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner can update club"
  ON word_clubs FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owner can delete club"
  ON word_clubs FOR DELETE
  USING (auth.uid() = owner_id);

-- Word club members
CREATE POLICY "Club members are viewable by everyone"
  ON word_club_members FOR SELECT USING (true);

CREATE POLICY "Users can join clubs"
  ON word_club_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own membership"
  ON word_club_members FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can leave clubs"
  ON word_club_members FOR DELETE
  USING (auth.uid() = user_id);

-- Player recaps: own data only
CREATE POLICY "Users can view own recaps"
  ON player_recaps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert recaps"
  ON player_recaps FOR INSERT
  WITH CHECK (true);

-- Churn signals: service-only (not user-visible)
CREATE POLICY "Service role full access on churn_signals"
  ON churn_signals FOR ALL
  USING (auth.role() = 'service_role');

-- Difficulty tracking: own data
CREATE POLICY "Users can view own difficulty"
  ON difficulty_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can manage difficulty"
  ON difficulty_tracking FOR ALL
  USING (auth.role() = 'service_role');

-- Re-engagement: service-only
CREATE POLICY "Service role full access on reengagement"
  ON reengagement_sequences FOR ALL
  USING (auth.role() = 'service_role');

-- ==================== HELPER FUNCTIONS ====================

-- Get or create difficulty tracking for a user+mode
CREATE OR REPLACE FUNCTION get_or_create_difficulty(p_user_id UUID, p_game_mode TEXT DEFAULT 'classic')
RETURNS difficulty_tracking AS $$
DECLARE
  v_result difficulty_tracking;
BEGIN
  SELECT * INTO v_result FROM difficulty_tracking WHERE user_id = p_user_id AND game_mode = p_game_mode;
  IF NOT FOUND THEN
    INSERT INTO difficulty_tracking (user_id, game_mode)
    VALUES (p_user_id, p_game_mode)
    ON CONFLICT (user_id, game_mode) DO NOTHING
    RETURNING * INTO v_result;
    IF v_result IS NULL THEN
      SELECT * INTO v_result FROM difficulty_tracking WHERE user_id = p_user_id AND game_mode = p_game_mode;
    END IF;
  END IF;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;

-- Update difficulty after a game result
CREATE OR REPLACE FUNCTION update_difficulty_after_game(
  p_user_id UUID,
  p_game_mode TEXT,
  p_won BOOLEAN
) RETURNS JSON AS $$
DECLARE
  v_track difficulty_tracking;
  v_new_wins INTEGER;
  v_new_games INTEGER;
  v_new_rate NUMERIC;
  v_new_offset INTEGER;
BEGIN
  SELECT * INTO v_track FROM get_or_create_difficulty(p_user_id, p_game_mode);

  v_new_wins := CASE WHEN p_won THEN v_track.recent_wins + 1 ELSE v_track.recent_wins END;
  v_new_games := v_track.recent_games + 1;

  -- Rolling window: reset after 20 games
  IF v_new_games > 20 THEN
    v_new_wins := CASE WHEN p_won THEN 1 ELSE 0 END;
    v_new_games := 1;
  END IF;

  v_new_rate := CASE WHEN v_new_games > 0 THEN v_new_wins::NUMERIC / v_new_games ELSE 0.5 END;

  -- Adjust difficulty offset: target 55-65% win rate
  v_new_offset := v_track.difficulty_offset;
  IF v_new_games >= 5 THEN
    IF v_new_rate > 0.70 THEN
      v_new_offset := LEAST(v_track.difficulty_offset + 1, 3);
    ELSIF v_new_rate < 0.50 THEN
      v_new_offset := GREATEST(v_track.difficulty_offset - 1, -3);
    END IF;
  END IF;

  UPDATE difficulty_tracking
  SET recent_wins = v_new_wins,
      recent_games = v_new_games,
      win_rate = v_new_rate,
      difficulty_offset = v_new_offset,
      last_adjustment_at = CASE WHEN v_new_offset != v_track.difficulty_offset THEN NOW() ELSE v_track.last_adjustment_at END,
      updated_at = NOW()
  WHERE user_id = p_user_id AND game_mode = p_game_mode;

  RETURN json_build_object(
    'win_rate', v_new_rate,
    'difficulty_offset', v_new_offset,
    'games_tracked', v_new_games
  );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;

-- Reset weekly club XP (called by cron)
CREATE OR REPLACE FUNCTION reset_weekly_club_xp()
RETURNS void AS $$
BEGIN
  UPDATE word_club_members SET weekly_xp = 0, games_this_week = 0, best_word_this_week = NULL;
  UPDATE word_clubs SET weekly_xp_total = 0;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_or_create_difficulty(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_or_create_difficulty(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_difficulty_after_game(UUID, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION reset_weekly_club_xp() TO service_role;
