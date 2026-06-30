-- Daily word quality: store a short kid-friendly meaning (in the puzzle language)
-- and a validation timestamp for the nightly quality validator.
-- See docs/2026-06-30-daily-word-quality-validator.md
ALTER TABLE public.daily_target_words
  ADD COLUMN IF NOT EXISTS meaning text,
  ADD COLUMN IF NOT EXISTS validated_at timestamptz;

COMMENT ON COLUMN public.daily_target_words.meaning IS
  'Short (<=8 word) kid-friendly meaning of the served word, in the puzzle language. Shown on the daily results page. Produced by the nightly word-quality validator.';
COMMENT ON COLUMN public.daily_target_words.validated_at IS
  'When the nightly word-quality validator last judged this row''s served word. NULL = not yet validated.';
