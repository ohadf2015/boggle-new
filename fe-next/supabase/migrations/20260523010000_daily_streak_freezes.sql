-- Per-date ledger of streak freezes consumed to protect the weekly-CHEST cycle.
-- A freeze the player earned (player_engagement.streak_freezes_available, e.g.
-- from a gold chest) can bridge a single missed daily so the 7-day chest cycle
-- isn't cleared. These dates are unioned into chest continuity but carry no
-- score row, so they never inflate the chest tier.
CREATE TABLE IF NOT EXISTS public.daily_streak_freezes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  frozen_date date        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, frozen_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_streak_freezes_player
  ON public.daily_streak_freezes (player_id);

ALTER TABLE public.daily_streak_freezes ENABLE ROW LEVEL SECURITY;

-- Players may read their own ledger. Inserts happen server-side via the service
-- role (bypasses RLS) when a freeze is consumed at daily submit — no client
-- INSERT policy on purpose.
DROP POLICY IF EXISTS "players read own streak freezes" ON public.daily_streak_freezes;
CREATE POLICY "players read own streak freezes" ON public.daily_streak_freezes
  FOR SELECT USING (auth.uid() = player_id);
