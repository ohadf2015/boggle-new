-- Fail-closed daily-word selection.
--
-- get_random_words_from_bank previously served ANY status='active' word, including
-- ~45% (en) to ~90% (ja) raw Wikipedia garbage and words the judge already marked
-- rejected-but-active. Now: once a language has a healthy pool of judge-APPROVED
-- words (judged_at set by sweepWordBank), it serves ONLY those. Until the pool
-- fills (sweep runs over a few nights), it keeps the old behavior so daily serving
-- never starves — each language tightens itself the moment it's ready.

CREATE OR REPLACE FUNCTION public.get_random_words_from_bank(
  p_language text,
  p_count integer DEFAULT 10,
  p_exclude_words text[] DEFAULT ARRAY[]::text[],
  p_min_days_since_used integer DEFAULT 30
)
RETURNS TABLE(word text, source text, difficulty_score integer, category text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_min_length INTEGER;
  v_max_length INTEGER;
  v_approved_ready INTEGER;
BEGIN
  IF p_language = 'ja' THEN
    v_min_length := 2; v_max_length := 4;
  ELSE
    v_min_length := 5; v_max_length := 7;
  END IF;

  -- Is the judge-approved pool big enough to serve from exclusively?
  SELECT COUNT(*) INTO v_approved_ready
  FROM daily_challenge_word_bank wb
  WHERE wb.language = p_language
    AND wb.status = 'active'
    AND wb.judged_at IS NOT NULL
    AND wb.validation_status = 'approved'
    AND LENGTH(wb.word) >= v_min_length
    AND LENGTH(wb.word) <= v_max_length;

  RETURN QUERY
  SELECT wb.word, wb.source, wb.difficulty_score, wb.category
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
    -- Fail-closed once the approved pool is healthy (>=40); otherwise transitional.
    AND (
      v_approved_ready < 40
      OR (wb.judged_at IS NOT NULL AND wb.validation_status = 'approved')
    )
  ORDER BY RANDOM()
  LIMIT p_count;
END;
$function$;

COMMENT ON FUNCTION public.get_random_words_from_bank IS
  'Daily-word selection. Serves ONLY judge-approved words once a language has >=40 of them (fail-closed); transitional (any active) until the sweep fills the pool.';
