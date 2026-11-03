-- Server-side "the reward moment was shown" flag, so a completed weekly quest is
-- celebrated once across devices instead of once per browser.
ALTER TABLE public.weekly_quests ADD COLUMN IF NOT EXISTS celebrated boolean NOT NULL DEFAULT false;
