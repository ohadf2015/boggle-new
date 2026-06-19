-- Performance: consolidate multiple permissive policies → single policy per action
-- Supabase advisor: multiple_permissive_policies (WARN) on teacher_access_allowlist (15)
--                  and teacher_access_requests (5).
-- Each table had 2 permissive policies per action for the same role set — Postgres
-- evaluates ALL permissive policies as OR conditions, doubling predicate cost per row.
--
-- teacher_access_allowlist: has duplicate admin policies (is_admin_user() version +
-- inline EXISTS version) and separate own-email policies. Fix:
--   1. Drop inline-EXISTS duplicates (taa_insert_admin, taa_select_admin, taa_update_admin)
--   2. Consolidate remaining admin+own pairs into a single policy per action
--
-- teacher_access_requests: has tar_admin_select + tar_select_own. Fix: merge into one.
--
-- Unused indexes (0 scans since stats reset, advisor INFO):
--   idx_word_pacts_player2_id, idx_tar_status, idx_taa_consumed

-- ── teacher_access_allowlist ────────────────────────────────────────────────

-- Step 1: drop inline-EXISTS duplicates (is_admin_user() versions are canonical)
DROP POLICY IF EXISTS taa_insert_admin ON public.teacher_access_allowlist;
DROP POLICY IF EXISTS taa_select_admin ON public.teacher_access_allowlist;
DROP POLICY IF EXISTS taa_update_admin ON public.teacher_access_allowlist;

-- Step 2: consolidate SELECT — admin OR own email
DROP POLICY IF EXISTS taa_admin_select ON public.teacher_access_allowlist;
DROP POLICY IF EXISTS taa_select_own_email ON public.teacher_access_allowlist;
CREATE POLICY taa_select ON public.teacher_access_allowlist
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    is_admin_user()
    OR lower(email) = lower(COALESCE(((SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text))
  );

-- Step 3: consolidate UPDATE — admin OR own email (with check mirrors using)
DROP POLICY IF EXISTS taa_admin_update ON public.teacher_access_allowlist;
DROP POLICY IF EXISTS taa_update_own_email ON public.teacher_access_allowlist;
CREATE POLICY taa_update ON public.teacher_access_allowlist
  AS PERMISSIVE FOR UPDATE
  TO public
  USING (
    is_admin_user()
    OR lower(email) = lower(COALESCE(((SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text))
  )
  WITH CHECK (
    is_admin_user()
    OR lower(email) = lower(COALESCE(((SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text))
  );

-- ── teacher_access_requests ─────────────────────────────────────────────────

-- Consolidate SELECT: tar_admin_select (admin) + tar_select_own (own row) → single policy
DROP POLICY IF EXISTS tar_admin_select ON public.teacher_access_requests;
DROP POLICY IF EXISTS tar_select_own ON public.teacher_access_requests;
CREATE POLICY tar_select ON public.teacher_access_requests
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    is_admin_user()
    OR (SELECT auth.uid() AS uid) = user_id
  );

-- ── Unused indexes ──────────────────────────────────────────────────────────

-- word_pacts: player2_id FK index — 0 scans (advisor flagged, in brief)
DROP INDEX IF EXISTS public.idx_word_pacts_player2_id;

-- teacher_access_requests: status index — 0 scans
DROP INDEX IF EXISTS public.idx_tar_status;

-- teacher_access_allowlist: consumed index — 0 scans
DROP INDEX IF EXISTS public.idx_taa_consumed;
