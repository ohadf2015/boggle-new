-- Independent 30-day expectations for /api/admin/edu-dashboard?window=30.
-- Written from the metric definitions, not from the TypeScript: test accounts and
-- machine requests are excluded here, counts are distinct people, windows are
-- (start, end]. Run read-only; compare with verify.ts --expected.
with w as (
  select now() as end_at, now() - interval '30 days' as start_at, now() - interval '60 days' as prior_start
),
machine_req as (
  select r.* from public.teacher_access_requests r
  where not (
    lower(trim(coalesce(r.email, ''))) like '%@example.com'
    or lower(trim(coalesce(r.email, ''))) like '%@lexiclash.test'
    or lower(trim(coalesce(r.email, ''))) like '%@test.com'
    or lower(trim(coalesce(r.email, ''))) like '%@mailtests.dev'
    or lower(trim(coalesce(r.email, ''))) like 'rls-test-%'
    or lower(trim(coalesce(r.email, ''))) like 'rls-update-test-%'
  )
  and not exists (select 1 from public.profiles p where p.id = r.user_id and p.is_test_account)
),
approved as (
  select distinct on (coalesce(user_id::text, lower(trim(coalesce(email, ''))))) *
  from machine_req
  where status = 'approved'
  order by coalesce(user_id::text, lower(trim(coalesce(email, '')))), reviewed_at desc nulls last
),
trial_users as (
  select user_id, reviewed_at from approved where user_id is not null and trial_expires_at is not null
),
paid as (
  select s.user_id, min(s.created_at) as created_at
  from public.subscriptions s
  join trial_users t on t.user_id = s.user_id
  where s.status = 'active'
  group by s.user_id
),
classes as (
  select c.id, c.teacher_id from public.classrooms c
  where not exists (select 1 from public.profiles p where p.id = c.teacher_id and p.is_test_account)
)
select
  (select count(*) from public.profiles p, w where p.user_role = 'teacher' and not p.is_test_account
     and p.last_seen_at > w.start_at and p.last_seen_at <= w.end_at) as active_teachers_cur,
  (select count(*) from public.profiles p, w where p.user_role = 'teacher' and not p.is_test_account
     and p.last_seen_at > w.prior_start and p.last_seen_at <= w.start_at) as active_teachers_prior,
  (select count(*) from approved, w where reviewed_at > w.start_at and reviewed_at <= w.end_at) as new_teachers_cur,
  (select count(*) from approved, w where reviewed_at > w.prior_start and reviewed_at <= w.start_at) as new_teachers_prior,
  (select count(*) from trial_users, w where reviewed_at > w.start_at and reviewed_at <= w.end_at) as trials_started_cur,
  (select count(*) from trial_users, w where reviewed_at > w.prior_start and reviewed_at <= w.start_at) as trials_started_prior,
  (select count(*) from paid, w where created_at > w.start_at and created_at <= w.end_at) as trials_paid_cur,
  (select count(*) from paid, w where created_at > w.prior_start and created_at <= w.start_at) as trials_paid_prior,
  (select count(distinct coalesce(user_id::text, lower(trim(coalesce(email, ''))))) from machine_req) as funnel_requested,
  (select count(distinct user_id) from approved where user_id is not null) as funnel_approved,
  (select count(distinct a.user_id) from approved a
     where a.user_id is not null and exists (select 1 from classes c where c.teacher_id = a.user_id)) as funnel_classroom,
  (select count(distinct a.user_id) from approved a
     where a.user_id is not null and exists (
       select 1 from classes c join public.classroom_memberships m on m.classroom_id = c.id
       where c.teacher_id = a.user_id)) as funnel_student,
  (select count(*) from classes) as classes_total,
  (select count(distinct m.student_id) from public.classroom_memberships m join classes c on c.id = m.classroom_id) as students_distinct;
