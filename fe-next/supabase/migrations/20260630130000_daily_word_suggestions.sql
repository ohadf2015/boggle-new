-- Player-suggested daily words. Submitted via API (service role), vetted nightly
-- by the same daily-word quality judge; approved ones are placed into an upcoming
-- puzzle slot. See docs/2026-06-30-daily-word-quality-validator.md
CREATE TABLE IF NOT EXISTS public.daily_word_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language varchar(8) NOT NULL,
  word text NOT NULL,
  suggested_by uuid,            -- NULL for guest submissions
  guest_fingerprint text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate')),
  reason text,                  -- judge verdict reason (esp. for rejected)
  meaning text,                 -- short definition captured when approved
  used_date date,               -- puzzle_date it was placed on, when approved
  judged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dws_status_lang ON public.daily_word_suggestions(status, language);
-- one pending entry per (language, word); collapses duplicate spam at the DB level
CREATE UNIQUE INDEX IF NOT EXISTS uq_dws_pending_word
  ON public.daily_word_suggestions(language, upper(word)) WHERE status = 'pending';

-- Service-role API mediates all access; RLS on with no policies = deny direct client access.
ALTER TABLE public.daily_word_suggestions ENABLE ROW LEVEL SECURITY;
