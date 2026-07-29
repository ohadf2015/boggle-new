-- Add "all_quests_complete_celebrated" flag for idempotent all-quests-complete reward
-- (daily + weekly both complete). Mirrors grand_slam_celebrated pattern.

ALTER TABLE public.player_daily_missions
  ADD COLUMN IF NOT EXISTS all_quests_complete_celebrated boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.player_daily_missions.all_quests_complete_celebrated IS 'True once the server-side all-quests-complete reward (XP + coins) has been granted. Ensures idempotency across reloads.';
