-- Winter holidays, phase 4: Holiday Arcade rounds.
--
-- One row per started arcade round. The API (service role) inserts it when a
-- signed-in player starts a round and settles it once through
-- holiday_arcade_settle, which takes a per-player-per-day lock so the daily
-- coin cap holds under concurrent submits. Players read their own rows.
-- Not in the realtime publication.

CREATE TABLE IF NOT EXISTS public.holiday_arcade_rounds (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_key   text        NOT NULL CHECK (event_key ~ '^(hanukkah|christmas)-[0-9]{4}$'),
  game        text        NOT NULL CHECK (game IN ('oil', 'dreidel', 'sufganiyah', 'sleigh', 'snowball', 'wrap')),
  lang        text        NOT NULL CHECK (lang IN ('en', 'he', 'es', 'sv', 'ja', 'ru')),
  seed        integer     NOT NULL,
  played_on   date        NOT NULL,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  score       integer     CHECK (score >= 0),
  coins       integer     NOT NULL DEFAULT 0 CHECK (coins >= 0)
);
CREATE INDEX IF NOT EXISTS holiday_arcade_rounds_user_day ON public.holiday_arcade_rounds (user_id, played_on);

ALTER TABLE public.holiday_arcade_rounds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.holiday_arcade_rounds FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.holiday_arcade_rounds TO authenticated;
GRANT ALL ON public.holiday_arcade_rounds TO service_role;
DROP POLICY IF EXISTS holiday_arcade_rounds_select_own ON public.holiday_arcade_rounds;
CREATE POLICY holiday_arcade_rounds_select_own ON public.holiday_arcade_rounds
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

-- Returns the coins granted (0..p_coins), or -1 when the round is unknown or already settled.
CREATE OR REPLACE FUNCTION public.holiday_arcade_settle(p_round uuid, p_user uuid, p_score integer, p_coins integer, p_cap integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_day  date;
  v_used integer;
  v_coins integer;
BEGIN
  SELECT played_on INTO v_day FROM public.holiday_arcade_rounds
   WHERE id = p_round AND user_id = p_user AND finished_at IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN -1;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('holiday_arcade:' || p_user::text || ':' || v_day::text));
  SELECT COALESCE(SUM(coins), 0) INTO v_used FROM public.holiday_arcade_rounds
   WHERE user_id = p_user AND played_on = v_day;
  v_coins := GREATEST(0, LEAST(GREATEST(p_coins, 0), p_cap - v_used));
  UPDATE public.holiday_arcade_rounds
     SET finished_at = now(), score = GREATEST(p_score, 0), coins = v_coins
   WHERE id = p_round;
  RETURN v_coins;
END;
$$;

REVOKE ALL ON FUNCTION public.holiday_arcade_settle(uuid, uuid, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.holiday_arcade_settle(uuid, uuid, integer, integer, integer) TO service_role;
