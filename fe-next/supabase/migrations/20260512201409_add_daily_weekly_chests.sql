CREATE TABLE public.daily_weekly_chests (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_start   date        NOT NULL,
  cycle_number  integer     NOT NULL,
  tier          text        NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold')),
  contents      jsonb       NOT NULL,
  opened_at     timestamptz,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (player_id, cycle_start)
);

CREATE INDEX idx_daily_weekly_chests_player
  ON public.daily_weekly_chests (player_id, created_at DESC);

ALTER TABLE public.daily_weekly_chests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players_own_chests" ON public.daily_weekly_chests
  FOR ALL USING (auth.uid() = player_id);
