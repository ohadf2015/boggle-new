-- merged_vocabulary_lessons_select_public (added outside migrations) applied to
-- every role and called has_lesson_access(), which anon may not EXECUTE since
-- 20260429160300. Any anon read of vocabulary_lessons (a teacher tab whose JWT
-- lapsed mid-refresh, the library discover feed for a signed-out visitor) then
-- failed whole with 42501 "permission denied for function has_lesson_access"
-- instead of returning the public lists. Split it by role: anon sees public
-- lists only and never calls the function; signed-in users keep the full check.

drop policy if exists merged_vocabulary_lessons_select_public on public.vocabulary_lessons;
drop policy if exists "Students can view assigned lessons" on public.vocabulary_lessons;
drop policy if exists vocabulary_lessons_select_anon on public.vocabulary_lessons;
drop policy if exists vocabulary_lessons_select_authenticated on public.vocabulary_lessons;

create policy vocabulary_lessons_select_anon
  on public.vocabulary_lessons for select
  to anon
  using (is_public = true);

create policy vocabulary_lessons_select_authenticated
  on public.vocabulary_lessons for select
  to authenticated
  using (
    is_public = true
    or (select auth.uid()) = teacher_id
    or public.has_lesson_access(id, (select auth.uid()))
  );
