-- "X% of players have this" for achievements, refreshed once a day.
--
-- Achievements live in profiles.achievement_counts (jsonb key -> times earned).
-- Counting holders on read would scan profiles on every profile view, so a daily
-- pg_cron job snapshots holders per key into this small table and the app reads it
-- with a row cap. Denominator: real players with at least one game; test accounts
-- excluded.

CREATE TABLE IF NOT EXISTS public.achievement_global_stats (
  achievement_key text PRIMARY KEY,
  holders integer NOT NULL,
  total_players integer NOT NULL,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.achievement_global_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS achievement_global_stats_read ON public.achievement_global_stats;
CREATE POLICY achievement_global_stats_read
  ON public.achievement_global_stats
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.refresh_achievement_global_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
BEGIN
  SELECT count(*) INTO v_total
  FROM public.profiles p
  WHERE COALESCE(p.is_test_account, false) = false
    AND COALESCE(p.total_games, 0) > 0;

  DELETE FROM public.achievement_global_stats;

  INSERT INTO public.achievement_global_stats (achievement_key, holders, total_players, refreshed_at)
  SELECT k.key, count(*)::integer, GREATEST(v_total, 1), now()
  FROM public.profiles p
  CROSS JOIN LATERAL jsonb_object_keys(
    CASE WHEN jsonb_typeof(p.achievement_counts) = 'object' THEN p.achievement_counts ELSE '{}'::jsonb END
  ) AS k(key)
  WHERE COALESCE(p.is_test_account, false) = false
    AND COALESCE(p.total_games, 0) > 0
  GROUP BY k.key;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_achievement_global_stats() FROM PUBLIC, anon, authenticated;

SELECT public.refresh_achievement_global_stats();

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'achievement-global-stats';

SELECT cron.schedule(
  'achievement-global-stats',
  '41 3 * * *',
  $$ SELECT public.refresh_achievement_global_stats(); $$
);
