-- World records per game, derived from the tables each mode already writes.
-- The hourly app route /api/cron/game-records reads candidates from
-- game_record_candidates(), applies the app-side public-name check (default and
-- profane names cannot be expressed in SQL), upserts game_records and notifies a
-- dethroned holder. Holders are signed-in, non-test, non-student players only.

CREATE TABLE IF NOT EXISTS public.game_records (
  record_key text PRIMARY KEY,
  mode text NOT NULL,
  holder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  holder_name text NOT NULL,
  score numeric NOT NULL,
  set_at timestamptz NOT NULL,
  previous_holder_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  previous_score numeric,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS game_records_holder_idx ON public.game_records (holder_id);

ALTER TABLE public.game_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS game_records_read ON public.game_records;
CREATE POLICY game_records_read
  ON public.game_records
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.game_records TO anon, authenticated;
GRANT ALL ON public.game_records TO service_role;

-- Top-score lookups per source; partial so guest rows stay out of the index.
CREATE INDEX IF NOT EXISTS game_results_record_idx
  ON public.game_results (game_mode, score DESC)
  WHERE player_id IS NOT NULL AND real_player_count >= 2;
CREATE INDEX IF NOT EXISTS game_sessions_record_idx
  ON public.game_sessions (mode, score DESC)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS quick_play_results_record_idx
  ON public.quick_play_results (mode, score DESC)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS daily_word_hunt_attempts_record_idx
  ON public.daily_word_hunt_attempts (efficiency_score DESC)
  WHERE player_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS daily_word_wheel_attempts_record_idx
  ON public.daily_word_wheel_attempts (score DESC)
  WHERE player_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.game_record_candidates(p_per_key integer DEFAULT 5)
RETURNS TABLE (
  record_key text,
  mode text,
  holder_id uuid,
  display_name text,
  username text,
  score numeric,
  set_at timestamptz,
  rank integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '10s'
AS $$
  WITH raw AS (
    (SELECT 'daily_word_hunt'::text AS record_key, 'daily'::text AS mode, player_id AS holder_id, efficiency_score::numeric AS score, COALESCE(completed_at, created_at) AS set_at
       FROM public.daily_word_hunt_attempts WHERE player_id IS NOT NULL AND efficiency_score IS NOT NULL
       ORDER BY efficiency_score DESC LIMIT 200)
    UNION ALL
    (SELECT 'daily_word_wheel', 'daily', player_id, score::numeric, COALESCE(completed_at, created_at)
       FROM public.daily_word_wheel_attempts WHERE player_id IS NOT NULL AND score IS NOT NULL
       ORDER BY score DESC LIMIT 200)
    UNION ALL
    (SELECT 'daily_connections', 'daily', player_id, score::numeric, created_at
       FROM public.connections_daily_scores WHERE player_id IS NOT NULL AND score IS NOT NULL
       ORDER BY score DESC LIMIT 200)
    UNION ALL
    (SELECT 'blast', 'blast', user_id, best_score::numeric, updated_at
       FROM public.blast_personal_bests WHERE user_id IS NOT NULL AND best_score IS NOT NULL
       ORDER BY best_score DESC LIMIT 200)
    UNION ALL
    (SELECT 'tower', 'tower', player_id, best_height_m::numeric, updated_at
       FROM public.word_tower_progress WHERE player_id IS NOT NULL AND best_height_m IS NOT NULL
       ORDER BY best_height_m DESC LIMIT 200)
    UNION ALL
    (SELECT 'single', 'single', user_id, score::numeric, created_at
       FROM public.game_sessions WHERE mode = 'singleplayer' AND user_id IS NOT NULL AND score IS NOT NULL
       ORDER BY score DESC LIMIT 200)
    UNION ALL
    (SELECT 'qp_classic', 'quickPlay', user_id, score::numeric, created_at
       FROM public.quick_play_results WHERE mode = 'classic' AND user_id IS NOT NULL AND score IS NOT NULL
       ORDER BY score DESC LIMIT 200)
    UNION ALL
    (SELECT 'qp_blast', 'quickPlay', user_id, score::numeric, created_at
       FROM public.quick_play_results WHERE mode = 'blast' AND user_id IS NOT NULL AND score IS NOT NULL
       ORDER BY score DESC LIMIT 200)
    UNION ALL
    (SELECT 'qp_word_hunt', 'quickPlay', user_id, score::numeric, created_at
       FROM public.quick_play_results WHERE mode = 'word-hunt' AND user_id IS NOT NULL AND score IS NOT NULL
       ORDER BY score DESC LIMIT 200)
    UNION ALL
    (SELECT 'qp_wheel_rush', 'quickPlay', user_id, score::numeric, created_at
       FROM public.quick_play_results WHERE mode = 'wheel-rush' AND user_id IS NOT NULL AND score IS NOT NULL
       ORDER BY score DESC LIMIT 200)
    UNION ALL
    (SELECT 'mp_classic', 'multiplayer', player_id, score::numeric, created_at
       FROM public.game_results WHERE game_mode = 'classic' AND real_player_count >= 2 AND player_id IS NOT NULL AND score IS NOT NULL
       ORDER BY score DESC LIMIT 200)
    UNION ALL
    (SELECT 'mp_word_hunt', 'multiplayer', player_id, score::numeric, created_at
       FROM public.game_results WHERE game_mode = 'word-hunt' AND real_player_count >= 2 AND player_id IS NOT NULL AND score IS NOT NULL
       ORDER BY score DESC LIMIT 200)
    UNION ALL
    (SELECT 'mp_wheel_rush', 'multiplayer', player_id, score::numeric, created_at
       FROM public.game_results WHERE game_mode = 'wheel-rush' AND real_player_count >= 2 AND player_id IS NOT NULL AND score IS NOT NULL
       ORDER BY score DESC LIMIT 200)
    UNION ALL
    (SELECT 'mp_blast', 'multiplayer', player_id, score::numeric, created_at
       FROM public.game_results WHERE game_mode = 'blast' AND real_player_count >= 2 AND player_id IS NOT NULL AND score IS NOT NULL
       ORDER BY score DESC LIMIT 200)
  ),
  eligible AS (
    SELECT r.*, p.display_name, p.username
    FROM raw r
    JOIN public.profiles p ON p.id = r.holder_id
    WHERE r.score > 0
      AND COALESCE(p.is_test_account, false) = false
      AND NOT EXISTS (SELECT 1 FROM public.classroom_memberships cm WHERE cm.student_id = r.holder_id)
      AND NOT EXISTS (SELECT 1 FROM public.parental_consents pc WHERE pc.user_id = r.holder_id)
      AND (
        (NULLIF(btrim(p.display_name), '') IS NOT NULL AND btrim(p.display_name) !~* '^(player[_-]|guest($|[_-]))')
        OR (NULLIF(btrim(p.username), '') IS NOT NULL AND btrim(p.username) !~* '^(player[_-]|guest($|[_-]))')
      )
  ),
  best_per_holder AS (
    SELECT DISTINCT ON (record_key, holder_id) *
    FROM eligible
    ORDER BY record_key, holder_id, score DESC, set_at ASC
  ),
  ranked AS (
    SELECT b.*, row_number() OVER (PARTITION BY record_key ORDER BY score DESC, set_at ASC) AS rn
    FROM best_per_holder b
  )
  SELECT record_key, mode, holder_id, display_name, username, score, set_at, rn::int AS rank
  FROM ranked
  WHERE rn <= LEAST(GREATEST(p_per_key, 1), 10)
  ORDER BY record_key, rn
$$;

REVOKE ALL ON FUNCTION public.game_record_candidates(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.game_record_candidates(integer) TO service_role;
