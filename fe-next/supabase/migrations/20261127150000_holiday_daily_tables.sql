-- Holiday Daily (Nightly Board / Advent Board), Holiday Tables and shamash/stocking rescue.
-- Only the API (service role) writes. Players read their own rows. None of these are in realtime.

ALTER TABLE public.holiday_event_progress
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'game' CHECK (source IN ('game', 'daily', 'friend'));

CREATE INDEX IF NOT EXISTS holiday_event_progress_event_played_idx
  ON public.holiday_event_progress (event_key, played_on);

-- One settlement per player per holiday day, whatever board language they played.
CREATE TABLE IF NOT EXISTS public.holiday_daily_results (
  user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_key     text        NOT NULL CHECK (event_key ~ '^(hanukkah|christmas)-[0-9]{4}$'),
  puzzle_date   date        NOT NULL,
  language      text        NOT NULL,
  kind          text        NOT NULL CHECK (kind IN ('nightly', 'advent')),
  gelt_words    integer     NOT NULL DEFAULT 0 CHECK (gelt_words >= 0),
  gift_found    boolean     NOT NULL DEFAULT false,
  coins         integer     NOT NULL DEFAULT 0 CHECK (coins >= 0),
  spin_face     text        CHECK (spin_face IN ('nun', 'gimel', 'hei', 'shin')),
  spin_coins    integer     CHECK (spin_coins >= 0),
  cracker_joke  integer     CHECK (cracker_joke BETWEEN 1 AND 50),
  cracker_coins integer     CHECK (cracker_coins >= 0),
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_key, puzzle_date)
);

CREATE TABLE IF NOT EXISTS public.holiday_tables (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_key text        NOT NULL CHECK (holiday_key IN ('hanukkah', 'christmas')),
  event_key   text        NOT NULL CHECK (event_key ~ '^(hanukkah|christmas)-[0-9]{4}$'),
  owner       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code        text        NOT NULL UNIQUE CHECK (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.holiday_table_members (
  table_id  uuid        NOT NULL REFERENCES public.holiday_tables(id) ON DELETE CASCADE,
  user_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_key text        NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (table_id, user_id),
  UNIQUE (user_id, event_key)
);

CREATE INDEX IF NOT EXISTS holiday_table_members_table_idx ON public.holiday_table_members (table_id);

CREATE TABLE IF NOT EXISTS public.holiday_rescues (
  inviter_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_key   text        NOT NULL,
  day_index   integer     NOT NULL CHECK (day_index BETWEEN 0 AND 11),
  rescued_on  date        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (inviter_id, event_key, day_index),
  UNIQUE (friend_id, inviter_id, rescued_on),
  CHECK (inviter_id <> friend_id)
);

CREATE INDEX IF NOT EXISTS holiday_rescues_friend_idx ON public.holiday_rescues (friend_id, rescued_on);

ALTER TABLE public.holiday_daily_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holiday_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holiday_table_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holiday_rescues ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.holiday_daily_results, public.holiday_tables, public.holiday_table_members, public.holiday_rescues
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.holiday_daily_results, public.holiday_tables, public.holiday_table_members, public.holiday_rescues
  TO authenticated;
GRANT ALL ON public.holiday_daily_results, public.holiday_tables, public.holiday_table_members, public.holiday_rescues
  TO service_role;

DROP POLICY IF EXISTS holiday_daily_results_select_own ON public.holiday_daily_results;
CREATE POLICY holiday_daily_results_select_own ON public.holiday_daily_results
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS holiday_tables_select_own ON public.holiday_tables;
CREATE POLICY holiday_tables_select_own ON public.holiday_tables
  FOR SELECT TO authenticated USING ((select auth.uid()) = owner);

DROP POLICY IF EXISTS holiday_table_members_select_own ON public.holiday_table_members;
CREATE POLICY holiday_table_members_select_own ON public.holiday_table_members
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS holiday_rescues_select_own ON public.holiday_rescues;
CREATE POLICY holiday_rescues_select_own ON public.holiday_rescues
  FOR SELECT TO authenticated USING ((select auth.uid()) IN (inviter_id, friend_id));
