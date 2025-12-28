-- =====================================================
-- Migration 021: Add Survival Mode Fields to Word Hunt
-- =====================================================
-- Adds fields to support survival mode mechanics:
-- - Words discovered from grid
-- - Life points remaining
-- - Clue tokens earned/spent
-- - Hints unlocked
-- - Efficiency score
-- =====================================================

-- Add survival mode columns to daily_word_hunt_attempts
ALTER TABLE daily_word_hunt_attempts
ADD COLUMN IF NOT EXISTS words_discovered JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS life_remaining INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clue_tokens_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clue_tokens_spent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS hints_unlocked INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS efficiency_score INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN daily_word_hunt_attempts.words_discovered IS 'JSONB array of words found from grid: [{word, timestamp, lifeGained, tokensGained}]';
COMMENT ON COLUMN daily_word_hunt_attempts.life_remaining IS 'Life points remaining when game ended (0-100)';
COMMENT ON COLUMN daily_word_hunt_attempts.clue_tokens_earned IS 'Total clue tokens earned from discovering words';
COMMENT ON COLUMN daily_word_hunt_attempts.clue_tokens_spent IS 'Total clue tokens spent in shop';
COMMENT ON COLUMN daily_word_hunt_attempts.hints_unlocked IS 'Number of AI hints unlocked (1-5)';
COMMENT ON COLUMN daily_word_hunt_attempts.efficiency_score IS 'Calculated efficiency score for leaderboard';

-- Create index on efficiency_score for leaderboards
CREATE INDEX IF NOT EXISTS idx_word_hunt_efficiency
  ON daily_word_hunt_attempts(puzzle_date, language, efficiency_score DESC);

-- Update the stats view to include survival metrics
DROP VIEW IF EXISTS daily_word_hunt_stats;
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
  ROUND(AVG(attempts_used) FILTER (WHERE solved = true), 1) as avg_attempts_solved,

  -- Survival mode metrics
  ROUND(AVG(life_remaining) FILTER (WHERE solved = true), 1) as avg_life_remaining,
  ROUND(AVG(efficiency_score) FILTER (WHERE solved = true), 1) as avg_efficiency_score,
  MAX(efficiency_score) as max_efficiency_score,
  ROUND(AVG(jsonb_array_length(words_discovered)), 1) as avg_words_discovered

FROM daily_word_hunt_attempts
GROUP BY puzzle_date, puzzle_number, language;

COMMENT ON VIEW daily_word_hunt_stats IS 'Aggregate statistics per puzzle including survival mode metrics';
