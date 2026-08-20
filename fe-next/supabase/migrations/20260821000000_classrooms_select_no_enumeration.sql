-- The classrooms SELECT policy carried a blanket first clause:
--
--     (auth.uid() IS NOT NULL AND join_code IS NOT NULL)
--       OR is_classroom_member(id, auth.uid())
--       OR auth.uid() = teacher_id
--
-- That first clause lets ANY signed-in user read EVERY classroom row — names and, worse,
-- join_codes — so the whole school directory plus a working key to each class was one
-- unfiltered select away from any account, including a throwaway one.
--
-- It existed so the join-by-code path could resolve a classroom for someone who is not yet a
-- member. That is no longer true:
--
--   * the join route resolves the code through the SECURITY DEFINER
--     lookup_classroom_by_join_code() RPC, which returns exactly the one matching row;
--   * canAddStudent() now reads capacity on the service-role client (it also had to, because
--     classroom_memberships is invisible to a non-member — the free 30-student cap was
--     counting 0 every time and had never once fired).
--
-- Every remaining reader is the owning teacher, an enrolled member, an admin, or a
-- service-role backend caller. The admin branch is explicit because the Teacher Funnel
-- dashboard (app/api/admin/teacher-funnel) counts classrooms across all teachers on the
-- request-scoped client and previously rode in on the blanket clause; is_admin_user() is the
-- same helper teacher_access_requests already uses.
--
-- Verified live after applying, with `set local role authenticated` + request.jwt.claims:
--   stranger  -> 0 classrooms, 0 join codes, lookup_classroom_by_join_code() still resolves 1
--   teacher   -> 1 (their own)
--   student   -> 1 (the one they are enrolled in)
DROP POLICY IF EXISTS "merged_classrooms_select_public" ON public.classrooms;

CREATE POLICY "merged_classrooms_select_public" ON public.classrooms
  FOR SELECT
  USING (
    is_classroom_member(id, (SELECT auth.uid()))
    OR (SELECT auth.uid()) = teacher_id
    OR is_admin_user()
  );
