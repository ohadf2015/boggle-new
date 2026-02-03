-- Migration: Enforce minimum word length for Word Hunt daily challenges
-- Purpose: Prevent 3-letter words from being assigned to Word Hunt (except Japanese)
-- Date: 2026-02-03

-- Add CHECK constraint to daily_challenge_word_bank table
-- This prevents short words from being added to the bank in the first place
-- Minimum lengths: en=4, he=4, sv=4, ja=2, es=4, fr=4, de=4
ALTER TABLE daily_challenge_word_bank
  DROP CONSTRAINT IF EXISTS check_word_min_length,
  ADD CONSTRAINT check_word_min_length CHECK (
    CASE language
      WHEN 'ja' THEN LENGTH(word) >= 2  -- Japanese kanji: 2+ chars
      ELSE LENGTH(word) >= 4            -- All other languages: 4+ chars
    END
  );

-- Update get_random_words_from_bank function to also filter by length
-- This provides defense-in-depth in case any 3-letter words exist in the table
CREATE OR REPLACE FUNCTION get_random_words_from_bank(
  p_language TEXT,
  p_count INTEGER DEFAULT 10,
  p_exclude_words TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_min_days_since_used INTEGER DEFAULT 30
)
RETURNS TABLE (
  word TEXT,
  source TEXT,
  difficulty_score INTEGER,
  category TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_min_length INTEGER;
BEGIN
  -- Set minimum length based on language
  v_min_length := CASE p_language
    WHEN 'ja' THEN 2  -- Japanese kanji: 2+ chars
    ELSE 4            -- All other languages: 4+ chars
  END;

  RETURN QUERY
  SELECT
    wb.word,
    wb.source,
    wb.difficulty_score,
    wb.category
  FROM daily_challenge_word_bank wb
  WHERE wb.language = p_language
    AND wb.status = 'active'
    AND wb.word != ALL(p_exclude_words)
    AND LENGTH(wb.word) >= v_min_length  -- NEW: Enforce minimum length
    AND (
      wb.last_used_at IS NULL
      OR wb.last_used_at < NOW() - (p_min_days_since_used || ' days')::INTERVAL
    )
  ORDER BY RANDOM()
  LIMIT p_count;
END;
$$;

-- Block any existing 3-letter words in the bank (except Japanese)
-- This ensures no 3-letter words can be selected going forward
UPDATE daily_challenge_word_bank
SET
  status = 'blocked',
  blocked_at = NOW(),
  blocked_reason = 'Word too short for Word Hunt (minimum 4 letters required)'
WHERE language != 'ja'
  AND LENGTH(word) < 4
  AND status = 'active';

-- Log blocked words for admin review
DO $$
DECLARE
  v_blocked_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_blocked_count
  FROM daily_challenge_word_bank
  WHERE language != 'ja'
    AND LENGTH(word) < 4
    AND status = 'blocked'
    AND blocked_reason LIKE '%too short%';

  IF v_blocked_count > 0 THEN
    RAISE NOTICE 'Blocked % existing 3-letter words from Word Hunt selection', v_blocked_count;
  END IF;
END $$;

-- Comments
COMMENT ON CONSTRAINT check_word_min_length ON daily_challenge_word_bank IS
  'Enforces minimum word length: 4+ letters for most languages, 2+ for Japanese kanji';
