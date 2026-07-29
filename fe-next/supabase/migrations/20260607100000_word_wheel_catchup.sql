-- Add is_catchup column to daily_word_wheel_attempts
-- Mirrors the existing is_catchup column on daily_word_hunt_attempts.
-- Catch-up plays (past-day replays) are excluded from weekly-chest continuity
-- to prevent grinding fabricated 7-day cycles.

ALTER TABLE public.daily_word_wheel_attempts
  ADD COLUMN IF NOT EXISTS is_catchup boolean NOT NULL DEFAULT false;

-- Index for filtering catch-up plays in chest/quest queries
CREATE INDEX IF NOT EXISTS idx_word_wheel_attempts_catchup
  ON public.daily_word_wheel_attempts (player_id, is_catchup)
  WHERE is_catchup = false;
