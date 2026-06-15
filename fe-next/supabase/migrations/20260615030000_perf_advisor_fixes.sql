-- Perf advisor fixes 2026-06-15
--
-- 1. Fix auth_rls_initplan on teacher_access_requests.
--    Policy "tar_insert_authenticated" uses a bare auth.uid() expression
--    which the Supabase advisor flagged as being re-evaluated for each row
--    scanned. Wrapping in (select auth.uid()) promotes it to an init-plan:
--    evaluated once per statement, not once per row.
--    Reversible: ALTER POLICY "tar_insert_authenticated"
--                ON public.teacher_access_requests
--                WITH CHECK (auth.uid() IS NOT NULL);
--
-- 2. Add covering index for word_pacts.player2_id FK.
--    Supabase advisor flagged word_pacts_player2_id_fkey has no index.
--    Without it, FK integrity checks and JOIN lookups by player2_id
--    require a sequential scan. IF NOT EXISTS makes this idempotent.
--    Reversible: DROP INDEX IF EXISTS idx_word_pacts_player2_id;

-- 1. Patch tar_insert_authenticated to use subselect form
ALTER POLICY "tar_insert_authenticated" ON public.teacher_access_requests
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- 2. Add FK index for word_pacts.player2_id
CREATE INDEX IF NOT EXISTS idx_word_pacts_player2_id
  ON public.word_pacts (player2_id);
