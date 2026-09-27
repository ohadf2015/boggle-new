-- Adds username (denormalized for triage) + reward tracking to feedback_reports.
ALTER TABLE public.feedback_reports
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS reward_granted boolean NOT NULL DEFAULT false;

-- Supports the "already rewarded today?" anti-abuse lookup.
CREATE INDEX IF NOT EXISTS idx_feedback_reports_user_reward
  ON public.feedback_reports (user_id, reward_granted, created_at);
