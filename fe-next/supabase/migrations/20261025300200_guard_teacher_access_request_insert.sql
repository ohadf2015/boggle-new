-- The public apply form may insert a request, but an approved row with a future
-- trial_expires_at is a live Pro entitlement, and tar_insert_any let any client
-- write one directly. Client inserts now always land as a fresh pending request
-- for the caller; approval stays with the service-role and admin paths.
create or replace function public.guard_teacher_access_request_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  new.status := 'pending';
  new.trial_expires_at := null;
  new.reviewed_at := null;
  new.reviewed_by := null;
  new.admin_note := null;
  new.user_id := auth.uid();
  new.trial_reminders_sent := '{}';
  new.activation_nudges_sent := '{}';
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists guard_teacher_access_request_insert on public.teacher_access_requests;
create trigger guard_teacher_access_request_insert
  before insert on public.teacher_access_requests
  for each row execute function public.guard_teacher_access_request_insert();

revoke update, delete, truncate on public.teacher_access_requests from anon;
revoke delete, truncate on public.teacher_access_requests from authenticated;

-- Allowlist rows are redeemed with the service role; no client needs to write them.
drop policy if exists taa_update_own_email on public.teacher_access_allowlist;
drop policy if exists taa_update on public.teacher_access_allowlist;
revoke insert, update, delete, truncate on public.teacher_access_allowlist from anon;
