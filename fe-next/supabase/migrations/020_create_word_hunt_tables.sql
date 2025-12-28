-- =====================================================
-- Migration 020: Word Hunt Daily Challenge Tables
-- =====================================================
-- Creates tables and views for the new Word Hunt mode
-- which replaces the old scoring-based daily challenge
-- with a Wordle-style word deduction game
-- =====================================================

-- Create the main Word Hunt attempts table
CREATE TABLE IF NOT EXISTS daily_word_hunt_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_date DATE NOT NULL,
  puzzle_number INTEGER NOT NULL,
  language VARCHAR(5) NOT NULL,

  -- Player identification (user or guest)
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  guest_fingerprint TEXT,
  display_name TEXT NOT NULL,
  avatar_emoji TEXT DEFAULT '🎯',
  avatar_color TEXT DEFAULT '#6366f1',

  -- Game results
  solved BOOLEAN NOT NULL,              -- true = found target word, false = failed
  attempts_used INTEGER NOT NULL,       -- 1-10 attempts
  target_word TEXT NOT NULL,            -- the word they were hunting for
  attempt_words JSONB NOT NULL,         -- array of {word, feedback, timestamp}

  -- Metadata
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT word_hunt_attempts_valid_count CHECK (attempts_used >= 1 AND attempts_used <= 10),
  CONSTRAINT word_hunt_user_once_daily UNIQUE(puzzle_date, language, player_id),
  CONSTRAINT word_hunt_guest_once_daily UNIQUE(puzzle_date, language, guest_fingerprint)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_word_hunt_puzzle_language
  ON daily_word_hunt_attempts(puzzle_date, language);

CREATE INDEX IF NOT EXISTS idx_word_hunt_leaderboard
  ON daily_word_hunt_attempts(puzzle_date, language, solved DESC, attempts_used ASC);

CREATE INDEX IF NOT EXISTS idx_word_hunt_player
  ON daily_word_hunt_attempts(player_id, puzzle_date DESC);

CREATE INDEX IF NOT EXISTS idx_word_hunt_guest
  ON daily_word_hunt_attempts(guest_fingerprint, puzzle_date DESC);

-- Create view for aggregate statistics (Wordle-style stats)
CREATE OR REPLACE VIEW daily_word_hunt_stats AS
SELECT
  puzzle_date,
  puzzle_number,
  language,
  COUNT(*) as total_players,
  COUNT(*) FILTER (WHERE solved = true) as solved_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE solved = true) / NULLIF(COUNT(*), 0), 1) as solve_rate,

  -- Attempt distribution for histogram (Wordle-style)
  COUNT(*) FILTER (WHERE solved = true AND attempts_used = 1) as solved_in_1,
  COUNT(*) FILTER (WHERE solved = true AND attempts_used = 2) as solved_in_2,
  COUNT(*) FILTER (WHERE solved = true AND attempts_used = 3) as solved_in_3,
  COUNT(*) FILTER (WHERE solved = true AND attempts_used = 4) as solved_in_4,
  COUNT(*) FILTER (WHERE solved = true AND attempts_used = 5) as solved_in_5,
  COUNT(*) FILTER (WHERE solved = true AND attempts_used = 6) as solved_in_6,
  COUNT(*) FILTER (WHERE solved = true AND attempts_used = 7) as solved_in_7,
  COUNT(*) FILTER (WHERE solved = true AND attempts_used = 8) as solved_in_8,
  COUNT(*) FILTER (WHERE solved = true AND attempts_used = 9) as solved_in_9,
  COUNT(*) FILTER (WHERE solved = true AND attempts_used = 10) as solved_in_10,
  COUNT(*) FILTER (WHERE solved = false) as failed_count,

  -- Average attempts (for solved only)
  ROUND(AVG(attempts_used) FILTER (WHERE solved = true), 1) as avg_attempts_solved

FROM daily_word_hunt_attempts
GROUP BY puzzle_date, puzzle_number, language;

-- Create table for personal Word Hunt statistics
CREATE TABLE IF NOT EXISTS word_hunt_player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  guest_fingerprint TEXT,

  -- Overall stats
  total_played INTEGER DEFAULT 0,
  total_solved INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,

  -- Attempt distribution (how many times solved in N attempts)
  solved_in_1 INTEGER DEFAULT 0,
  solved_in_2 INTEGER DEFAULT 0,
  solved_in_3 INTEGER DEFAULT 0,
  solved_in_4 INTEGER DEFAULT 0,
  solved_in_5 INTEGER DEFAULT 0,
  solved_in_6 INTEGER DEFAULT 0,
  solved_in_7 INTEGER DEFAULT 0,
  solved_in_8 INTEGER DEFAULT 0,
  solved_in_9 INTEGER DEFAULT 0,
  solved_in_10 INTEGER DEFAULT 0,

  last_played_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT word_hunt_stats_player_unique UNIQUE(player_id),
  CONSTRAINT word_hunt_stats_guest_unique UNIQUE(guest_fingerprint)
);

-- Create index for player stats lookups
CREATE INDEX IF NOT EXISTS idx_word_hunt_player_stats_player
  ON word_hunt_player_stats(player_id);

CREATE INDEX IF NOT EXISTS idx_word_hunt_player_stats_guest
  ON word_hunt_player_stats(guest_fingerprint);

-- Enable Row Level Security (RLS)
ALTER TABLE daily_word_hunt_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_hunt_player_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_word_hunt_attempts

-- Anyone can view all attempts (for leaderboard)
CREATE POLICY "Anyone can view word hunt attempts"
  ON daily_word_hunt_attempts
  FOR SELECT
  USING (true);

-- Authenticated users can insert their own attempts
CREATE POLICY "Users can insert their own word hunt attempts"
  ON daily_word_hunt_attempts
  FOR INSERT
  WITH CHECK (
    auth.uid() = player_id
  );

-- Guests can insert attempts (validated by app logic)
CREATE POLICY "Guests can insert word hunt attempts"
  ON daily_word_hunt_attempts
  FOR INSERT
  WITH CHECK (
    guest_fingerprint IS NOT NULL AND player_id IS NULL
  );

-- RLS Policies for word_hunt_player_stats

-- Anyone can view stats
CREATE POLICY "Anyone can view word hunt player stats"
  ON word_hunt_player_stats
  FOR SELECT
  USING (true);

-- Users can update their own stats
CREATE POLICY "Users can update their own word hunt stats"
  ON word_hunt_player_stats
  FOR ALL
  USING (
    auth.uid() = player_id OR
    (guest_fingerprint IS NOT NULL AND player_id IS NULL)
  );

-- Function to update player stats after each attempt
CREATE OR REPLACE FUNCTION update_word_hunt_player_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_stats_id UUID;
  v_attempt_column TEXT;
BEGIN
  -- Determine which identifier to use
  IF NEW.player_id IS NOT NULL THEN
    -- Find or create stats record for user
    INSERT INTO word_hunt_player_stats (player_id, total_played, total_solved, current_streak, last_played_date)
    VALUES (NEW.player_id, 0, 0, 0, NEW.puzzle_date)
    ON CONFLICT (player_id) DO NOTHING;

    v_stats_id := (SELECT id FROM word_hunt_player_stats WHERE player_id = NEW.player_id);
  ELSIF NEW.guest_fingerprint IS NOT NULL THEN
    -- Find or create stats record for guest
    INSERT INTO word_hunt_player_stats (guest_fingerprint, total_played, total_solved, current_streak, last_played_date)
    VALUES (NEW.guest_fingerprint, 0, 0, 0, NEW.puzzle_date)
    ON CONFLICT (guest_fingerprint) DO NOTHING;

    v_stats_id := (SELECT id FROM word_hunt_player_stats WHERE guest_fingerprint = NEW.guest_fingerprint);
  ELSE
    RETURN NEW; -- No valid identifier, skip stats update
  END IF;

  -- Update stats
  IF NEW.solved THEN
    -- Determine which attempt column to increment
    v_attempt_column := 'solved_in_' || NEW.attempts_used::TEXT;

    -- Update stats with dynamic column
    EXECUTE format('
      UPDATE word_hunt_player_stats
      SET
        total_played = total_played + 1,
        total_solved = total_solved + 1,
        %I = %I + 1,
        last_played_date = $1,
        updated_at = NOW()
      WHERE id = $2
    ', v_attempt_column, v_attempt_column)
    USING NEW.puzzle_date, v_stats_id;
  ELSE
    -- Failed to solve
    UPDATE word_hunt_player_stats
    SET
      total_played = total_played + 1,
      last_played_date = NEW.puzzle_date,
      updated_at = NOW()
    WHERE id = v_stats_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update stats
DROP TRIGGER IF EXISTS trigger_update_word_hunt_stats ON daily_word_hunt_attempts;
CREATE TRIGGER trigger_update_word_hunt_stats
  AFTER INSERT ON daily_word_hunt_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_word_hunt_player_stats();

-- Add comments for documentation
COMMENT ON TABLE daily_word_hunt_attempts IS 'Stores Word Hunt daily challenge attempts (Wordle-style word deduction game)';
COMMENT ON TABLE word_hunt_player_stats IS 'Aggregate statistics for Word Hunt players (both authenticated users and guests)';
COMMENT ON VIEW daily_word_hunt_stats IS 'Aggregate statistics per puzzle for Wordle-style distribution charts';
COMMENT ON COLUMN daily_word_hunt_attempts.solved IS 'Whether the player found the target word';
COMMENT ON COLUMN daily_word_hunt_attempts.attempts_used IS 'Number of attempts used (1-10)';
COMMENT ON COLUMN daily_word_hunt_attempts.attempt_words IS 'JSONB array of {word, feedback: [{letter, feedback, position}], timestamp}';
