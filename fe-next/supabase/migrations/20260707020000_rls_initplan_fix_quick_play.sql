-- RLS initplan fix: quick_play_challenges_accept policy
-- Supabase advisor: re-evaluates auth.uid() per row (initplan overhead).
-- Fix: wrap auth.uid() in (select ...) so Postgres materialises it once per query.
-- Prior hardening (20260706120000): USING(accepted_by IS NULL) stays unchanged;
-- only WITH CHECK gets the initplan wrapper.
DROP POLICY IF EXISTS quick_play_challenges_accept ON public.quick_play_challenges;
CREATE POLICY quick_play_challenges_accept ON public.quick_play_challenges FOR UPDATE
  USING  (accepted_by IS NULL)
  WITH CHECK (accepted_by = (SELECT auth.uid()));

-- Same fix for insert policies that reference auth.uid() directly.
DROP POLICY IF EXISTS quick_play_results_insert ON public.quick_play_results;
CREATE POLICY quick_play_results_insert ON public.quick_play_results FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS quick_play_challenges_insert ON public.quick_play_challenges;
CREATE POLICY quick_play_challenges_insert ON public.quick_play_challenges FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = challenger_id);
