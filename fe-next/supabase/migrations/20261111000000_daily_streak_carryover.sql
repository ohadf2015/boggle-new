-- Guest days carried onto a new account so signing up never drops the streak.
-- Written by the weekly-chest status route (service role) from guest attempt
-- rows only; read alongside the attempt rows for the streak, never for chests.
-- No client policies: only the service role reads or writes it. Not in the
-- realtime publication (no consumer).

CREATE TABLE IF NOT EXISTS public.daily_streak_carryover (
  player_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  carried_date date NOT NULL,
  guest_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, carried_date)
);

CREATE INDEX IF NOT EXISTS daily_streak_carryover_guest_id_idx
  ON public.daily_streak_carryover (guest_id);

ALTER TABLE public.daily_streak_carryover ENABLE ROW LEVEL SECURITY;
