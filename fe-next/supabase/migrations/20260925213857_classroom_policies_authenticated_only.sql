-- Sentry JAVASCRIPT-NEXTJS-2A6: "permission denied for function is_classroom_owner" (42501).
-- 20260429160300 revoked EXECUTE on the SECURITY DEFINER classroom helpers from anon,
-- but these policies still applied TO public, so an anon (no-JWT) SELECT evaluated the
-- helper and errored instead of returning zero rows. Every branch needs auth.uid(), which
-- is NULL for anon, so scoping them to authenticated changes no visible result.
ALTER POLICY "merged_classroom_memberships_select_public" ON public.classroom_memberships TO authenticated;
ALTER POLICY "merged_classroom_memberships_insert_public" ON public.classroom_memberships TO authenticated;
ALTER POLICY "merged_classroom_memberships_delete_public" ON public.classroom_memberships TO authenticated;
ALTER POLICY "Teachers can update classroom memberships" ON public.classroom_memberships TO authenticated;
ALTER POLICY "merged_classrooms_select_public" ON public.classrooms TO authenticated;
ALTER POLICY "merged_lesson_assignments_select_public" ON public.lesson_assignments TO authenticated;
