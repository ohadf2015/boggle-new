-- =============================================
-- READ-ONLY Teacher Pro funnel, last 30 days (t_bb6c0c52).
-- Paste into the Supabase SQL editor. No writes.
--
-- Counts distinct non-test teachers who reached each step in the window.
-- onboarding_completed has no profile column: that step is the server event
-- teacher_funnel_step (step = onboarding_completed) in PostHog, filtered on
-- properties.$host = 'www.lexiclash.live'. The row below is the slot so the
-- six steps stay in one readout; teachers is null on purpose.
--
-- A rehearsal seat is the teacher's own phone and does not count as a student.
-- =============================================

WITH bounds AS (
  SELECT now() - interval '30 days' AS since
),
real_teachers AS (
  SELECT p.id
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE COALESCE(p.is_test_account, false) = false
    AND u.email IS NOT NULL
    AND u.email NOT ILIKE '%@lexiclash.test'
),
approved AS (
  SELECT count(DISTINCT r.user_id) AS teachers
  FROM public.teacher_access_requests r
  JOIN real_teachers t ON t.id = r.user_id
  WHERE r.status = 'approved'
    AND r.reviewed_at >= (SELECT since FROM bounds)
),
classrooms_first AS (
  SELECT c.teacher_id, min(c.created_at) AS at
  FROM public.classrooms c
  JOIN real_teachers t ON t.id = c.teacher_id
  GROUP BY c.teacher_id
),
assignments_first AS (
  SELECT c.teacher_id, min(a.created_at) AS at
  FROM public.lesson_assignments a
  JOIN public.classrooms c ON c.id = a.classroom_id
  JOIN real_teachers t ON t.id = c.teacher_id
  GROUP BY c.teacher_id
),
students_first AS (
  SELECT c.teacher_id, min(m.joined_at) AS at
  FROM public.classroom_memberships m
  JOIN public.classrooms c ON c.id = m.classroom_id
  JOIN real_teachers t ON t.id = c.teacher_id
  WHERE m.student_id <> c.teacher_id
    AND COALESCE(m.is_rehearsal, false) = false
  GROUP BY c.teacher_id
),
trials AS (
  SELECT count(DISTINCT se.user_id) AS teachers
  FROM public.subscription_events se
  JOIN real_teachers t ON t.id = se.user_id
  WHERE se.created_at >= (SELECT since FROM bounds)
    AND se.event_type IN ('subscription.created', 'subscription.active')
    AND COALESCE(se.payload->>'trial', '') = 'true'
)
SELECT * FROM (
  SELECT 'teacher_approved' AS step, 1 AS step_index, teachers, 'teacher_access_requests.reviewed_at' AS source
  FROM approved
  UNION ALL
  SELECT 'onboarding_completed', 2, NULL::bigint, 'posthog teacher_funnel_step step=onboarding_completed'
  UNION ALL
  SELECT 'classroom_created', 3, count(*)::bigint, 'classrooms.created_at first class'
  FROM classrooms_first
  WHERE at >= (SELECT since FROM bounds)
  UNION ALL
  SELECT 'first_assignment_created', 4, count(*)::bigint, 'lesson_assignments.created_at via classrooms'
  FROM assignments_first
  WHERE at >= (SELECT since FROM bounds)
  UNION ALL
  SELECT 'students_joined', 5, count(*)::bigint, 'classroom_memberships.joined_at first real student'
  FROM students_first
  WHERE at >= (SELECT since FROM bounds)
  UNION ALL
  SELECT 'trial_started', 6, teachers, 'subscription_events trial webhook'
  FROM trials
) steps
ORDER BY step_index;
