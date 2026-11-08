-- One row per player per day: the prize for clearing the two required daily
-- quests (Word Wheel + Word Hunt). Mirrors daily_all_clear_claims; the primary
-- key is the idempotency guard, so a second claim hits 23505.
-- Service-role only (RLS on, no policies); not part of supabase_realtime.
CREATE TABLE IF NOT EXISTS public.daily_day_clear_claims (
  player_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  claim_date date        NOT NULL,
  coins      integer     NOT NULL,
  xp         integer     NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, claim_date)
);

ALTER TABLE public.daily_day_clear_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.daily_day_clear_claims FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.daily_day_clear_claims TO service_role;
