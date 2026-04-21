-- Add per-mission "celebrated" flags to deduplicate completion toasts
-- across devices (Capacitor webview + browser share server state instead
-- of siloed localStorage). Toast fires only when completed && !celebrated,
-- then client POSTs to mark celebrated.

ALTER TABLE public.player_daily_missions
  ADD COLUMN IF NOT EXISTS word_hunt_celebrated   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS adventure_celebrated   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS community_celebrated   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS grand_slam_celebrated  boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.player_daily_missions.word_hunt_celebrated  IS 'True once the client has shown the word-hunt completion toast to the user.';
COMMENT ON COLUMN public.player_daily_missions.adventure_celebrated  IS 'True once the client has shown the adventure completion toast to the user.';
COMMENT ON COLUMN public.player_daily_missions.community_celebrated  IS 'True once the client has shown the multiplayer/community completion toast to the user.';
COMMENT ON COLUMN public.player_daily_missions.grand_slam_celebrated IS 'True once the client has shown the Grand Slam completion toast to the user.';
