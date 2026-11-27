-- =============================================
-- READ-ONLY Teacher Pro funnel, last 30 days (t_bb6c0c52).
-- Paste into the Supabase SQL editor. No writes.
--
-- Counts distinct non-test teachers who reached each step in the window.
-- onboarding_completed has no profile column. The beacon writes a durable
-- subscription_events row (event_type = teacher_funnel_step, payload.step =
-- onboarding_completed). This readout counts a teacher's first such row, and
-- only if that teacher still has user_role = teacher — a repeat beacon does
-- not pull an older completion into the window, and a student cannot inflate it.
--
-- trial_started counts the canonical teacher_trial_started row and the legacy
-- subscription.active/created envelope Polar still logs beside it.
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
onboarding_first AS (
  SELECT se.user_id, min(se.created_at) AS at
  FROM public.subscription_events se
  JOIN real_teachers t ON t.id = se.user_id
  JOIN public.profiles p ON p.id = t.id AND p.user_role = 'teacher'
  WHERE se.event_type = 'teacher_funnel_step'
    AND se.payload->>'step' = 'onboarding_completed'
  GROUP BY se.user_id
),
onboarding AS (
  SELECT count(*) AS teachers
  FROM onboarding_first
  WHERE at >= (SELECT since FROM bounds)
),
trials AS (
  SELECT count(DISTINCT se.user_id) AS teachers
  FROM public.subscription_events se
  JOIN real_teachers t ON t.id = se.user_id
  WHERE se.created_at >= (SELECT since FROM bounds)
    AND (
      se.event_type = 'teacher_trial_started'
      OR (
        se.event_type IN ('subscription.created', 'subscription.active')
        AND COALESCE(se.payload->>'trial', '') = 'true'
      )
    )
)
SELECT * FROM (
  SELECT 'teacher_approved' AS step, 1 AS step_index, teachers, 'teacher_access_requests.reviewed_at' AS source
  FROM approved
  UNION ALL
  SELECT 'onboarding_completed', 2, teachers, 'subscription_events teacher_funnel_step step=onboarding_completed'
  FROM onboarding
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
  SELECT 'trial_started', 6, teachers, 'subscription_events teacher_trial_started'
  FROM trials
  UNION ALL
  SELECT 'trial_canceled', 7, count(DISTINCT se.user_id), 'subscription_events teacher_trial_canceled or still-trialing cancel'
  FROM public.subscription_events se
  JOIN real_teachers t ON t.id = se.user_id
  WHERE se.created_at >= (SELECT since FROM bounds)
    AND (
      se.event_type = 'teacher_trial_canceled'
      OR (
        se.event_type = 'subscription.canceled'
        AND COALESCE(se.payload->>'trial', '') = 'true'
        AND EXISTS (
          SELECT 1 FROM public.subscriptions s
          WHERE s.user_id = se.user_id
            AND s.tier = 'pro'
            AND s.status = 'trialing'
            AND s.current_period_end > now()
        )
      )
    )
  UNION ALL
  SELECT 'trial_expired', 8, count(DISTINCT se.user_id), 'subscription_events teacher_trial_expired, excluding a trial that is still on'
  FROM public.subscription_events se
  JOIN real_teachers t ON t.id = se.user_id
  WHERE se.created_at >= (SELECT since FROM bounds)
    AND se.event_type = 'teacher_trial_expired'
    AND NOT EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = se.user_id
        AND s.tier = 'pro'
        AND s.status = 'trialing'
        AND s.current_period_end > now()
    )
) steps
ORDER BY step_index;
