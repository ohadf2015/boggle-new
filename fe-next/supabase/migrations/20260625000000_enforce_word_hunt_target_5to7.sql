-- Migration: Enforce 5-7 letter Word Hunt daily target words
-- Date: 2026-06-25
-- Moves daily target words into the fun-to-reveal 5-7 letter band. Previously only
-- a minimum of 4 was enforced and there was no maximum, so the live word bank
-- served 4-letter and overlong targets. Aligns the live selection with the new
-- 5-7 pools used by practice / multiplayer / daily-fallback. Japanese stays 2-4
-- (kanji compounds). Reversible: re-blocking flips status back; constraint droppable.
-- (A one-time repair of already-scheduled out-of-band rows in daily_target_words
--  was applied via ops SQL; not reproduced here as it picks random replacements.)

-- 1) Block existing ACTIVE out-of-band words FIRST so the new CHECK can be added.
UPDATE daily_challenge_word_bank
SET status = 'blocked',
    blocked_at = NOW(),
    blocked_reason = 'Out of Word Hunt target range (5-7 letters; ja 2-4)'
WHERE status = 'active'
  AND CASE language
        WHEN 'ja' THEN (LENGTH(word) < 2 OR LENGTH(word) > 4)
        ELSE (LENGTH(word) < 5 OR LENGTH(word) > 7)
      END;

-- 2) Replace the min-only constraint with a min+max range constraint, scoped to
--    active rows so previously-blocked short/long words can remain in the table.
ALTER TABLE daily_challenge_word_bank
  DROP CONSTRAINT IF EXISTS check_word_min_length,
  DROP CONSTRAINT IF EXISTS check_word_length,
  ADD CONSTRAINT check_word_length CHECK (
    status <> 'active'
    OR CASE language
         WHEN 'ja' THEN LENGTH(word) BETWEEN 2 AND 4
         ELSE LENGTH(word) BETWEEN 5 AND 7
       END
  );

COMMENT ON CONSTRAINT check_word_length ON daily_challenge_word_bank IS
  'Active Word Hunt targets must be 5-7 letters (Japanese 2-4 kanji chars).';

-- 3) Update the selection RPC to filter by BOTH min and max length.
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
  v_max_length INTEGER;
BEGIN
  IF p_language = 'ja' THEN
    v_min_length := 2; v_max_length := 4;  -- Japanese kanji compounds
  ELSE
    v_min_length := 5; v_max_length := 7;  -- fun-to-reveal target band
  END IF;

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
    AND LENGTH(wb.word) >= v_min_length
    AND LENGTH(wb.word) <= v_max_length
    AND (
      wb.last_used_at IS NULL
      OR wb.last_used_at < NOW() - (p_min_days_since_used || ' days')::INTERVAL
    )
  ORDER BY RANDOM()
  LIMIT p_count;
END;
$$;
