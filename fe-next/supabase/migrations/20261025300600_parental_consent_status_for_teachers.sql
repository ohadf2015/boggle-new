-- Teachers could read whole parental_consents rows for their students, including
-- the parent's email, IP address and user agent. They now get status only, through
-- an owner-checked function. The two helper functions were callable by any signed-in
-- user (anonymous guests included) for any user id: an age and consent oracle.
-- Inside a definer function current_user is the owner, so the caller is read from the JWT role.
drop policy if exists "Teachers can view student consent in their classrooms" on public.parental_consents;
drop policy if exists "Teachers can view student consent" on public.parental_consents;

revoke all on public.parental_consents from anon;

create or replace function public.classroom_consent_status(p_classroom_id uuid)
returns table (student_id uuid, has_consent boolean, consent_given_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select m.student_id, (pc.id is not null) as has_consent, pc.consent_given_at
  from public.classroom_memberships m
  left join public.parental_consents pc
    on pc.user_id = m.student_id and pc.revoked_at is null
  where public.is_classroom_owner(p_classroom_id, auth.uid())
    and m.classroom_id = p_classroom_id;
$$;

revoke all on function public.classroom_consent_status(uuid) from public, anon;
grant execute on function public.classroom_consent_status(uuid) to authenticated;

create or replace function public.has_active_consent(check_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon')
     and not (check_user_id = auth.uid() or public.is_teacher_of_student(check_user_id)) then
    return false;
  end if;
  return exists (
    select 1 from public.parental_consents
    where user_id = check_user_id
      and revoked_at is null
  );
end;
$$;

create or replace function public.get_user_age_from_consent(check_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  birth_year integer;
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon')
     and not (check_user_id = auth.uid() or public.is_teacher_of_student(check_user_id)) then
    return null;
  end if;
  select child_birth_year into birth_year
  from public.parental_consents
  where user_id = check_user_id
    and revoked_at is null;
  if birth_year is null then
    return null;
  end if;
  return extract(year from now())::integer - birth_year;
end;
$$;
