-- Fix auth RLS initplan: wrap auth.uid() in (select auth.uid()) so PostgreSQL
-- evaluates it once per statement instead of once per row.
-- Supabase advisor: "auth_rls_initplan" on curator_proposals.

-- curator_language_assignments
DROP POLICY IF EXISTS "curators read own assignments" ON public.curator_language_assignments;
CREATE POLICY "curators read own assignments"
  ON public.curator_language_assignments FOR SELECT
  USING (curator_id = (SELECT auth.uid()) OR public.is_admin_user());

-- curator_proposals (SELECT)
DROP POLICY IF EXISTS "curators read own proposals" ON public.curator_proposals;
CREATE POLICY "curators read own proposals"
  ON public.curator_proposals FOR SELECT
  USING (curator_id = (SELECT auth.uid()) OR public.is_admin_user());

-- curator_proposals (INSERT)
DROP POLICY IF EXISTS "curators create proposals in their language" ON public.curator_proposals;
CREATE POLICY "curators create proposals in their language"
  ON public.curator_proposals FOR INSERT
  WITH CHECK (
    curator_id = (SELECT auth.uid())
    AND public.is_language_curator(language)
    AND status = 'proposed'
  );
