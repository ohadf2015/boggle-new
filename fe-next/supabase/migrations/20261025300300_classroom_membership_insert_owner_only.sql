-- A student could insert their own membership straight through PostgREST with
-- only a classroom id, skipping the join code, the seat cap and a teacher's
-- removal. Students now join only through the join route (service role); the
-- classroom owner may still add students directly.
drop policy if exists "Students can join classrooms" on public.classroom_memberships;
drop policy if exists merged_classroom_memberships_insert_public on public.classroom_memberships;
create policy merged_classroom_memberships_insert_public on public.classroom_memberships
  for insert to authenticated
  with check (public.is_classroom_owner(classroom_id, (select auth.uid())));

revoke insert, update, delete, truncate on public.classroom_memberships from anon;
