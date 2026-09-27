-- Word-bank proactive-sweep support + fail-closed selection.
--
-- The daily word bank is ~45% (en) to ~90% (ja) raw Wikipedia garbage (proper
-- nouns, sentence fragments). The existing `validation_status` was set by a weak
-- themed-batch scorer (it "approved" ARES/ODIN/BASTET proper nouns) and is NOT
-- trustworthy. We add `judged_at` as the trust anchor: only the real LLM judge
-- (sweepWordBank) stamps it. `meaning` caches the judge's definition so year-ahead
-- slot assignment reuses it without re-judging.

ALTER TABLE public.daily_challenge_word_bank
  ADD COLUMN IF NOT EXISTS judged_at timestamptz,
  ADD COLUMN IF NOT EXISTS meaning text;

-- Sweep frontier: active words the real judge hasn't seen yet.
CREATE INDEX IF NOT EXISTS idx_dcwb_unjudged
  ON public.daily_challenge_word_bank (language, status)
  WHERE judged_at IS NULL;

-- Servable frontier: judge-approved words (fail-closed selection reads this).
CREATE INDEX IF NOT EXISTS idx_dcwb_servable
  ON public.daily_challenge_word_bank (language, validation_status, last_used_at)
  WHERE status = 'active' AND judged_at IS NOT NULL;

COMMENT ON COLUMN public.daily_challenge_word_bank.judged_at IS
  'Set ONLY by the LLM sweep (sweepWordBank). NULL = never judged by the trusted judge; the old validation_status preset is not trustworthy. Selection requires judged_at IS NOT NULL.';
COMMENT ON COLUMN public.daily_challenge_word_bank.meaning IS
  'Short kid-friendly definition from the judge, cached so year-ahead slot assignment reuses it.';

-- Sweep frontier fetch: active, never-judged, length-correct words.
-- PostgREST has no length operator, so the length band lives here (mirrors
-- get_random_words_from_bank). Random order so concurrent/cron runs don't all
-- contend on the same head rows.
CREATE OR REPLACE FUNCTION public.get_unjudged_bank_words(
  p_language text,
  p_count integer DEFAULT 25
)
RETURNS TABLE(word text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_min INTEGER;
  v_max INTEGER;
BEGIN
  IF p_language = 'ja' THEN v_min := 2; v_max := 4;
  ELSE v_min := 5; v_max := 7;
  END IF;

  RETURN QUERY
  SELECT wb.word
  FROM daily_challenge_word_bank wb
  WHERE wb.language = p_language
    AND wb.status = 'active'
    AND wb.judged_at IS NULL
    AND LENGTH(wb.word) >= v_min
    AND LENGTH(wb.word) <= v_max
  ORDER BY RANDOM()
  LIMIT p_count;
END;
$function$;
