-- Personalized per-player word mastery cache.
-- Page load reads this table; it is NOT added to supabase_realtime.
-- Seeded from game_sessions on first visit, then incremented from savePlayerWord.

CREATE TABLE IF NOT EXISTS public.player_word_mastery (
  player_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  word text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  times_solved integer NOT NULL DEFAULT 0,
  times_solved_unhinted integer NOT NULL DEFAULT 0,
  times_solved_fast_unhinted integer NOT NULL DEFAULT 0,
  times_failed integer NOT NULL DEFAULT 0,
  times_hinted integer NOT NULL DEFAULT 0,
  total_solve_ms bigint NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 50,
  status text NOT NULL CHECK (status IN ('mastered', 'learning')),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, word, language)
);

CREATE INDEX IF NOT EXISTS player_word_mastery_player_status_score_idx
  ON public.player_word_mastery (player_id, status, score);

CREATE INDEX IF NOT EXISTS player_word_mastery_player_language_idx
  ON public.player_word_mastery (player_id, language);

ALTER TABLE public.player_word_mastery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own word mastery" ON public.player_word_mastery;
CREATE POLICY "Users can view own word mastery"
  ON public.player_word_mastery
  FOR SELECT
  USING ((select auth.uid()) = player_id);

DROP POLICY IF EXISTS "Users can insert own word mastery" ON public.player_word_mastery;
CREATE POLICY "Users can insert own word mastery"
  ON public.player_word_mastery
  FOR INSERT
  WITH CHECK ((select auth.uid()) = player_id);

DROP POLICY IF EXISTS "Users can update own word mastery" ON public.player_word_mastery;
CREATE POLICY "Users can update own word mastery"
  ON public.player_word_mastery
  FOR UPDATE
  USING ((select auth.uid()) = player_id)
  WITH CHECK ((select auth.uid()) = player_id);

DROP TRIGGER IF EXISTS player_word_mastery_updated_at ON public.player_word_mastery;
CREATE TRIGGER player_word_mastery_updated_at
  BEFORE UPDATE ON public.player_word_mastery
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION public.record_word_mastery_event(
  p_player_id uuid,
  p_word text,
  p_language text,
  p_outcome text,
  p_used_hint boolean DEFAULT false,
  p_duration_ms integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_word text := lower(trim(p_word));
  v_language text := lower(trim(p_language));
  v_fast boolean := (p_duration_ms IS NOT NULL AND p_duration_ms <= 8000);
  v_solved int := 0;
  v_solved_unhinted int := 0;
  v_solved_fast_unhinted int := 0;
  v_failed int := 0;
  v_hinted int := 0;
  v_solve_ms bigint := 0;
  v_slow_unhinted int := 0;
  v_score int := 50;
  v_status text := 'learning';
BEGIN
  IF p_player_id IS NULL OR v_word IS NULL OR length(v_word) < 2 THEN
    RETURN;
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> p_player_id THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  IF p_outcome = 'failed' THEN
    v_failed := 1;
  ELSIF p_outcome = 'solved' THEN
    v_solved := 1;
    v_solve_ms := COALESCE(p_duration_ms, 0);
    IF p_used_hint THEN
      v_hinted := 1;
    ELSE
      v_solved_unhinted := 1;
      IF v_fast THEN
        v_solved_fast_unhinted := 1;
      END IF;
    END IF;
  ELSE
    RETURN;
  END IF;

  INSERT INTO public.player_word_mastery (
    player_id, word, language,
    times_solved, times_solved_unhinted, times_solved_fast_unhinted,
    times_failed, times_hinted, total_solve_ms,
    score, status, last_seen_at
  )
  VALUES (
    p_player_id, v_word, COALESCE(NULLIF(v_language, ''), 'en'),
    v_solved, v_solved_unhinted, v_solved_fast_unhinted,
    v_failed, v_hinted, v_solve_ms,
    50, 'learning', now()
  )
  ON CONFLICT (player_id, word, language) DO UPDATE SET
    times_solved = player_word_mastery.times_solved + EXCLUDED.times_solved,
    times_solved_unhinted = player_word_mastery.times_solved_unhinted + EXCLUDED.times_solved_unhinted,
    times_solved_fast_unhinted = player_word_mastery.times_solved_fast_unhinted + EXCLUDED.times_solved_fast_unhinted,
    times_failed = player_word_mastery.times_failed + EXCLUDED.times_failed,
    times_hinted = player_word_mastery.times_hinted + EXCLUDED.times_hinted,
    total_solve_ms = player_word_mastery.total_solve_ms + EXCLUDED.total_solve_ms,
    last_seen_at = now(),
    updated_at = now();

  SELECT
    times_solved_unhinted,
    times_solved_fast_unhinted,
    times_failed,
    times_hinted
  INTO v_solved_unhinted, v_solved_fast_unhinted, v_failed, v_hinted
  FROM public.player_word_mastery
  WHERE player_id = p_player_id AND word = v_word AND language = COALESCE(NULLIF(v_language, ''), 'en');

  v_slow_unhinted := GREATEST(v_solved_unhinted - v_solved_fast_unhinted, 0);
  v_score := 50
    - (20 * v_failed)
    - (15 * v_hinted)
    + (20 * v_solved_fast_unhinted)
    + (10 * v_slow_unhinted)
    + CASE WHEN v_solved_fast_unhinted > 1 THEN 10 ELSE 0 END;
  v_score := GREATEST(0, LEAST(100, v_score));

  IF v_solved_fast_unhinted >= 1 AND v_failed = 0 AND v_hinted = 0 THEN
    v_status := 'mastered';
  ELSE
    v_status := 'learning';
  END IF;

  UPDATE public.player_word_mastery
  SET score = v_score, status = v_status
  WHERE player_id = p_player_id AND word = v_word AND language = COALESCE(NULLIF(v_language, ''), 'en');
END;
$$;

REVOKE ALL ON FUNCTION public.record_word_mastery_event(uuid, text, text, text, boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_word_mastery_event(uuid, text, text, text, boolean, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_word_mastery_event(uuid, text, text, text, boolean, integer) TO authenticated;

COMMENT ON TABLE public.player_word_mastery IS
  'Per-player word mastery cache. Solved fast without hints = mastered; hints or fails = learning.';
COMMENT ON FUNCTION public.record_word_mastery_event IS
  'Incremental mastery upsert. Call fire-and-forget from word submit; never on the hot game path.';

INSERT INTO public.feature_flags (flag_name, enabled, admin_only, rollout_percentage, description)
VALUES (
  'word_mastery_v1',
  true,
  false,
  0,
  'Personalized word mastery at /profile/words. rollout 0 = off for public; env NEXT_PUBLIC_WORD_MASTERY=1 or PostHog word-mastery-v1=enabled to A/B.'
)
ON CONFLICT (flag_name) DO UPDATE
  SET enabled = EXCLUDED.enabled,
      admin_only = EXCLUDED.admin_only,
      rollout_percentage = EXCLUDED.rollout_percentage,
      description = EXCLUDED.description,
      updated_at = now();
