-- Winter holiday events (Hanukkah "8 Nights", Christmas "12 Gifts").
--
-- One row per player per event day they played. The primary key is the
-- idempotency guard: a retried or double-fired "game finished" POST hits 23505
-- and reads the row back instead of granting the day's reward twice.
-- `event_key` is '<holiday>-<window start year>' (hanukkah-2027 runs into 2028).
-- Players read their own rows; only the API (service role) writes. Not in realtime.
CREATE TABLE IF NOT EXISTS public.holiday_event_progress (
  user_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_key      text        NOT NULL CHECK (event_key ~ '^(hanukkah|christmas)-[0-9]{4}$'),
  day_index      integer     NOT NULL CHECK (day_index BETWEEN 0 AND 11),
  played_on      date        NOT NULL,
  claimed_reward jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_key, day_index)
);

ALTER TABLE public.holiday_event_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.holiday_event_progress FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.holiday_event_progress TO authenticated;
GRANT ALL ON public.holiday_event_progress TO service_role;

DROP POLICY IF EXISTS holiday_event_progress_select_own ON public.holiday_event_progress;
CREATE POLICY holiday_event_progress_select_own ON public.holiday_event_progress
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);
