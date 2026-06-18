-- Perf advisor fixes 2026-06-18 — auth_rls_initplan on the teacher-access tables.
--
-- Applied live via the Supabase Management API on 2026-06-18 (the nightly lane
-- deferred them believing the MCP was unavailable; it was not). Recorded here so a
-- fresh database / migration replay reproduces the same state. All statements are
-- idempotent (ALTER POLICY is declarative; re-running sets the same expression).
--
-- These supersede part 1 of 20260615030000_perf_advisor_fixes.sql, which targeted
-- `tar_insert_authenticated` — a policy since replaced by `tar_insert_any` in the
-- 2026-06-09 teacher-access RLS repair. The live advisor now flags the SELECT/UPDATE
-- policies below instead (bare auth.uid()/auth.jwt() re-evaluated per row).
--
-- Wrapping auth.uid()/auth.jwt() in a scalar subselect promotes them to an init-plan
-- (evaluated ONCE per statement, not once per scanned row). Semantically identical —
-- pure performance. Reversible by removing the `(select …)` wrapper.

-- teacher_access_requests: own-row SELECT
ALTER POLICY tar_select_own ON public.teacher_access_requests
  USING ((select auth.uid()) = user_id);

-- teacher_access_allowlist: own-email SELECT
ALTER POLICY taa_select_own_email ON public.teacher_access_allowlist
  USING (lower(email) = lower(COALESCE(((select auth.jwt()) ->> 'email'), '')));

-- teacher_access_allowlist: own-email UPDATE
ALTER POLICY taa_update_own_email ON public.teacher_access_allowlist
  USING (lower(email) = lower(COALESCE(((select auth.jwt()) ->> 'email'), '')));
