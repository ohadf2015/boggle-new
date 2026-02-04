-- Performance indexes for improved query speed
-- Migration: 20260204000000_add_performance_indexes.sql
--
-- This migration adds indexes that were identified as missing during performance audit:
-- 1. Leaderboard total_score DESC for efficient rank calculations
-- 2. Leaderboard player_id for quick player lookups
-- 3. Community words compound index for word validation lookups

-- Leaderboard indexes for rank calculations and player lookups
-- The total_score DESC index significantly speeds up rank calculation queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_total_score_desc
  ON leaderboard(total_score DESC);

CREATE INDEX IF NOT EXISTS idx_leaderboard_player_id
  ON leaderboard(player_id);

-- Community words indexes for word validation
-- This compound index speeds up the common lookup pattern: word + language
CREATE INDEX IF NOT EXISTS idx_community_words_word_language
  ON community_words(word, language);

-- Index for getting approved words by language (used in word lists)
CREATE INDEX IF NOT EXISTS idx_community_words_language_approval
  ON community_words(language, approval_count DESC)
  WHERE approval_count >= 3;

-- Invalid word submissions index for duplicate checking
CREATE INDEX IF NOT EXISTS idx_invalid_word_submissions_word_lang
  ON invalid_word_submissions(word, language);

-- Daily challenges index for date-based lookups
CREATE INDEX IF NOT EXISTS idx_daily_challenges_date_language
  ON daily_challenges(challenge_date, language);

-- Game sessions index for player history lookups (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_sessions') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_game_sessions_player_created
      ON game_sessions(player_id, created_at DESC)';
  END IF;
END $$;

-- Analyze tables to update statistics after index creation
ANALYZE leaderboard;
ANALYZE community_words;
ANALYZE invalid_word_submissions;
ANALYZE daily_challenges;
