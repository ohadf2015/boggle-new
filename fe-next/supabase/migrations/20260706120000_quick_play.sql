-- Quick Play (beta): solo rounds scored vs solver-perfect
CREATE TABLE IF NOT EXISTS public.quick_play_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('classic','blast','word-hunt','wheel-rush')),
  seed text NOT NULL,
  score integer NOT NULL CHECK (score >= 0),
  perfect_score integer NOT NULL CHECK (perfect_score > 0),
  score_pct numeric(5,2) NOT NULL CHECK (score_pct >= 0 AND score_pct <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quick_play_results_today_idx ON public.quick_play_results (created_at, score_pct);
CREATE INDEX IF NOT EXISTS quick_play_results_user_idx ON public.quick_play_results (user_id, mode, created_at DESC);

CREATE TABLE IF NOT EXISTS public.quick_play_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('classic','blast','word-hunt','wheel-rush')),
  seed text NOT NULL,
  challenger_score integer NOT NULL,
  challenger_score_pct numeric(5,2) NOT NULL,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_score integer,
  accepted_score_pct numeric(5,2),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quick_play_challenges_challenger_idx ON public.quick_play_challenges (challenger_id, created_at DESC);

ALTER TABLE public.quick_play_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_play_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quick_play_results_select ON public.quick_play_results;
CREATE POLICY quick_play_results_select ON public.quick_play_results FOR SELECT USING (true);
DROP POLICY IF EXISTS quick_play_results_insert ON public.quick_play_results;
CREATE POLICY quick_play_results_insert ON public.quick_play_results FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS quick_play_challenges_select ON public.quick_play_challenges;
CREATE POLICY quick_play_challenges_select ON public.quick_play_challenges FOR SELECT USING (true);
DROP POLICY IF EXISTS quick_play_challenges_insert ON public.quick_play_challenges;
CREATE POLICY quick_play_challenges_insert ON public.quick_play_challenges FOR INSERT WITH CHECK (auth.uid() = challenger_id);
DROP POLICY IF EXISTS quick_play_challenges_accept ON public.quick_play_challenges;
CREATE POLICY quick_play_challenges_accept ON public.quick_play_challenges FOR UPDATE
  USING (accepted_by IS NULL OR accepted_by = auth.uid())
  WITH CHECK (accepted_by = auth.uid());

-- Percentile among today's rounds; empty day -> 100 (you're first, celebrate)
CREATE OR REPLACE FUNCTION public.quick_play_percentile_today(p_score_pct numeric)
RETURNS numeric
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    ROUND(100.0 * (COUNT(*) FILTER (WHERE score_pct < p_score_pct)) / NULLIF(COUNT(*), 0), 0),
    100
  ) FROM public.quick_play_results WHERE created_at >= date_trunc('day', now());
$$;

CREATE OR REPLACE FUNCTION public.get_quick_play_leaderboard(p_range text, p_limit int DEFAULT 50)
RETURNS TABLE (user_id uuid, best_score_pct numeric, best_score int, rounds bigint, rank bigint)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT r.user_id,
         MAX(r.score_pct) AS best_score_pct,
         MAX(r.score) AS best_score,
         COUNT(*) AS rounds,
         RANK() OVER (ORDER BY MAX(r.score_pct) DESC, MAX(r.score) DESC) AS rank
  FROM public.quick_play_results r
  WHERE (p_range = 'all' OR r.created_at >= date_trunc('day', now()))
  GROUP BY r.user_id
  ORDER BY best_score_pct DESC, best_score DESC
  LIMIT p_limit;
$$;

-- Hardening (applied live 2026-07-06): RLS UPDATE can't restrict columns —
-- column-level privileges so an accepter can only write the accept fields.
REVOKE UPDATE ON public.quick_play_challenges FROM authenticated, anon;
GRANT UPDATE (accepted_by, accepted_score, accepted_score_pct) ON public.quick_play_challenges TO authenticated;
DROP POLICY IF EXISTS quick_play_challenges_accept ON public.quick_play_challenges;
CREATE POLICY quick_play_challenges_accept ON public.quick_play_challenges FOR UPDATE
  USING (accepted_by IS NULL)
  WITH CHECK (accepted_by = auth.uid());
