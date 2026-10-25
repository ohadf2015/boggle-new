-- The free class and seat caps lived only in API routes, so a direct PostgREST
-- insert skipped them and two parallel requests both passed the count. These
-- triggers count and insert under one per-teacher / per-class lock. Pro mirrors
-- resolveProEntitlement (lib/education/proGrant.ts); the access trial does not
-- lift caps (lib/education/teacherPlanGate.ts). Existing rows are grandfathered:
-- only new inserts are checked.
create or replace function public.teacher_has_pro_for_caps(p_teacher uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = p_teacher
      and s.tier = 'pro'
      and (
        (coalesce(s.source, 'polar') <> 'admin_grant' and s.status in ('active', 'trialing'))
        or (s.source = 'admin_grant' and s.status = 'active' and s.current_period_end > now())
      )
  );
$$;

revoke all on function public.teacher_has_pro_for_caps(uuid) from public, anon, authenticated;

create or replace function public.enforce_free_classroom_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class_limit constant integer := 3;
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('classroom_cap:' || new.teacher_id::text, 0));
  if public.teacher_has_pro_for_caps(new.teacher_id) then
    return new;
  end if;
  select count(*) into v_count from public.classrooms where teacher_id = new.teacher_id;
  if v_count >= v_class_limit then
    raise exception 'CLASS_LIMIT_REACHED'
      using detail = json_build_object('currentCount', v_count, 'limit', v_class_limit)::text;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_free_classroom_cap on public.classrooms;
create trigger enforce_free_classroom_cap
  before insert on public.classrooms
  for each row execute function public.enforce_free_classroom_cap();

create or replace function public.enforce_free_student_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_limit constant integer := 50;
  v_teacher uuid;
  v_count integer;
begin
  select teacher_id into v_teacher from public.classrooms where id = new.classroom_id;
  if v_teacher is null or new.student_id = v_teacher then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('student_cap:' || new.classroom_id::text, 0));
  if public.teacher_has_pro_for_caps(v_teacher) then
    return new;
  end if;
  select count(*) into v_count
  from public.classroom_memberships
  where classroom_id = new.classroom_id and student_id <> v_teacher;
  if v_count >= v_student_limit then
    raise exception 'STUDENT_LIMIT_REACHED'
      using detail = json_build_object('currentCount', v_count, 'limit', v_student_limit)::text;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_free_student_cap on public.classroom_memberships;
create trigger enforce_free_student_cap
  before insert on public.classroom_memberships
  for each row execute function public.enforce_free_student_cap();

revoke all on function public.enforce_free_classroom_cap() from public, anon, authenticated;
revoke all on function public.enforce_free_student_cap() from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'classrooms_name_not_blank' and conrelid = 'public.classrooms'::regclass
  ) then
    alter table public.classrooms
      add constraint classrooms_name_not_blank check (length(btrim(name)) > 0) not valid;
  end if;
end;
$$;
