-- Parent report links are signed bearer URLs. A teacher can now revoke every link
-- issued so far for one student: links signed before revoked_before stop working.
-- Read and written only by the service role (the report page and the teacher route).
create table if not exists public.parent_report_link_revocations (
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id uuid not null,
  revoked_before timestamptz not null default now(),
  primary key (classroom_id, student_id)
);

alter table public.parent_report_link_revocations enable row level security;
revoke all on public.parent_report_link_revocations from anon, authenticated;
