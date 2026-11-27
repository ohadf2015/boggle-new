-- Winter holidays, phase 3: Mystery Gift, comeback, Hide & Seek, secret eggs.
--
-- holiday_event_claims: one row per (player, event, kind) for once-per-event
-- rewards (kind 'gift' | 'comeback' | 'seeker'); the primary key is the
-- double-grant guard. holiday_day_games counts finished games per local day
-- for the comeback rule. holiday_hunt_finds: one Hide & Seek find per day.
-- holiday_egg_finds: secret words, mascot eggs, bells, permanent eggs.
-- Players read their own rows; only the API (service role) writes. Not in realtime.

CREATE TABLE IF NOT EXISTS public.holiday_event_claims (
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_key  text        NOT NULL CHECK (event_key ~ '^(hanukkah|christmas)-[0-9]{4}$'),
  kind       text        NOT NULL CHECK (kind IN ('gift', 'comeback', 'seeker')),
  detail     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_key, kind)
);

CREATE TABLE IF NOT EXISTS public.holiday_day_games (
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_key    text        NOT NULL CHECK (event_key ~ '^(hanukkah|christmas)-[0-9]{4}$'),
  played_on    date        NOT NULL,
  games        integer     NOT NULL DEFAULT 0 CHECK (games >= 0),
  words        integer     NOT NULL DEFAULT 0 CHECK (words >= 0),
  team         text        CHECK (team IN ('red', 'white')),
  last_game_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_key, played_on)
);
CREATE INDEX IF NOT EXISTS holiday_day_games_team_day ON public.holiday_day_games (played_on, team) WHERE team IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.holiday_hunt_finds (
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_key  text        NOT NULL CHECK (event_key ~ '^(hanukkah|christmas)-[0-9]{4}$'),
  find_date  date        NOT NULL,
  slot       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_key, find_date)
);

CREATE TABLE IF NOT EXISTS public.holiday_egg_finds (
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_key  text        NOT NULL CHECK (event_key ~ '^(hanukkah|christmas)-[0-9]{4}$'),
  egg_id     text        NOT NULL CHECK (egg_id ~ '^[a-z0-9_]{2,40}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_key, egg_id)
);

ALTER TABLE public.holiday_event_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.holiday_event_claims FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.holiday_event_claims TO authenticated;
GRANT ALL ON public.holiday_event_claims TO service_role;
DROP POLICY IF EXISTS holiday_event_claims_select_own ON public.holiday_event_claims;
CREATE POLICY holiday_event_claims_select_own ON public.holiday_event_claims
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

ALTER TABLE public.holiday_day_games ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.holiday_day_games FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.holiday_day_games TO authenticated;
GRANT ALL ON public.holiday_day_games TO service_role;
DROP POLICY IF EXISTS holiday_day_games_select_own ON public.holiday_day_games;
CREATE POLICY holiday_day_games_select_own ON public.holiday_day_games
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

ALTER TABLE public.holiday_hunt_finds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.holiday_hunt_finds FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.holiday_hunt_finds TO authenticated;
GRANT ALL ON public.holiday_hunt_finds TO service_role;
DROP POLICY IF EXISTS holiday_hunt_finds_select_own ON public.holiday_hunt_finds;
CREATE POLICY holiday_hunt_finds_select_own ON public.holiday_hunt_finds
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

ALTER TABLE public.holiday_egg_finds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.holiday_egg_finds FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.holiday_egg_finds TO authenticated;
GRANT ALL ON public.holiday_egg_finds TO service_role;
DROP POLICY IF EXISTS holiday_egg_finds_select_own ON public.holiday_egg_finds;
CREATE POLICY holiday_egg_finds_select_own ON public.holiday_egg_finds
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
