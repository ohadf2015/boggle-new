-- The free per-class assignment cap lived only in the AssignmentCreator UI while the
-- browser inserts lesson_assignments directly, so any PostgREST call skipped it.
-- Counts every row of the class (the list the creator counts) under a per-class lock.
-- Re-assigning a lesson the class already has falls through to the unique constraint,
-- which the client turns into an update. Existing rows are grandfathered.
create or replace function public.enforce_free_assignment_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment_limit constant integer := 3;
  v_teacher uuid;
  v_count integer;
begin
  select teacher_id into v_teacher from public.classrooms where id = new.classroom_id;
  if v_teacher is null then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('assignment_cap:' || new.classroom_id::text, 0));
  if exists (
    select 1 from public.lesson_assignments
    where classroom_id = new.classroom_id and lesson_id = new.lesson_id
  ) then
    return new;
  end if;
  if public.teacher_has_pro_for_caps(v_teacher) then
    return new;
  end if;
  select count(*) into v_count
  from public.lesson_assignments
  where classroom_id = new.classroom_id;
  if v_count >= v_assignment_limit then
    raise exception 'ASSIGNMENT_LIMIT_REACHED'
      using detail = json_build_object('currentCount', v_count, 'limit', v_assignment_limit)::text;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_free_assignment_cap on public.lesson_assignments;
create trigger enforce_free_assignment_cap
  before insert on public.lesson_assignments
  for each row execute function public.enforce_free_assignment_cap();

revoke all on function public.enforce_free_assignment_cap() from public, anon, authenticated;
