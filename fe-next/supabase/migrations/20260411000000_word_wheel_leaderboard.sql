-- =====================================================
-- Migration: Word Wheel Daily Challenge Tables
-- =====================================================
-- Creates tables and views for Word Wheel leaderboard
-- =====================================================

-- Create the Word Wheel attempts table
CREATE TABLE IF NOT EXISTS daily_word_wheel_attempts (
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
  avatar_image TEXT,
  country_code VARCHAR(5),

  -- Game results
  score INTEGER NOT NULL DEFAULT 0,
  word_count INTEGER NOT NULL DEFAULT 0,
  words_found JSONB NOT NULL DEFAULT '[]'::jsonb,
  longest_word TEXT,
  longest_word_length INTEGER,
  time_seconds INTEGER NOT NULL DEFAULT 0,
  center_letter CHAR(1),

  -- Metadata
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints: one attempt per player per day per language
  CONSTRAINT word_wheel_user_once_daily UNIQUE(puzzle_date, language, player_id),
  CONSTRAINT word_wheel_guest_once_daily UNIQUE(puzzle_date, language, guest_fingerprint)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_word_wheel_puzzle_language
  ON daily_word_wheel_attempts(puzzle_date, language);

CREATE INDEX IF NOT EXISTS idx_word_wheel_leaderboard
  ON daily_word_wheel_attempts(puzzle_date, language, score DESC, completed_at ASC);

CREATE INDEX IF NOT EXISTS idx_word_wheel_player
  ON daily_word_wheel_attempts(player_id, puzzle_date DESC);

-- Daily leaderboard view
CREATE OR REPLACE VIEW daily_word_wheel_leaderboard AS
SELECT
    dwa.puzzle_date,
    dwa.puzzle_number,
    dwa.language,
    dwa.player_id,
    dwa.guest_fingerprint,
    COALESCE(p.display_name, dwa.display_name, 'Guest Player') as display_name,
    COALESCE(p.avatar_emoji, dwa.avatar_emoji, '🎯') as avatar_emoji,
    COALESCE(p.avatar_color, dwa.avatar_color, '#6366f1') as avatar_color,
    p.profile_picture_url,
    COALESCE(p.country_code, dwa.country_code) as country_code,
    dwa.score,
    dwa.word_count,
    dwa.longest_word,
    dwa.time_seconds,
    dwa.center_letter,
    dwa.completed_at,
    ROW_NUMBER() OVER (
        PARTITION BY dwa.puzzle_date, dwa.language
        ORDER BY
            dwa.score DESC,
            dwa.word_count DESC,
            dwa.completed_at ASC
    ) as rank_position
FROM daily_word_wheel_attempts dwa
LEFT JOIN profiles p ON dwa.player_id = p.id
ORDER BY dwa.puzzle_date DESC, rank_position ASC;

COMMENT ON VIEW daily_word_wheel_leaderboard IS 'Daily Word Wheel leaderboard ranked by score';

-- Enable RLS
ALTER TABLE daily_word_wheel_attempts ENABLE ROW LEVEL SECURITY;

-- Anyone can view (for leaderboard)
CREATE POLICY "Anyone can view word wheel attempts"
  ON daily_word_wheel_attempts FOR SELECT USING (true);

-- Authenticated users can insert their own
CREATE POLICY "Users can insert their own word wheel attempts"
  ON daily_word_wheel_attempts FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- Guests can insert
CREATE POLICY "Guests can insert word wheel attempts"
  ON daily_word_wheel_attempts FOR INSERT
  WITH CHECK (guest_fingerprint IS NOT NULL AND player_id IS NULL);

-- Service role bypass for server-side inserts
CREATE POLICY "Service role full access word wheel"
  ON daily_word_wheel_attempts FOR ALL
  USING (auth.role() = 'service_role');
