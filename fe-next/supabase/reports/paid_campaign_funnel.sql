-- =============================================
-- READ-ONLY campaign readout (t_dc68f166). No writes — paste into the
-- Supabase SQL editor. Daily ops readout for the Meta paid campaign.
-- Signup day is Asia/Jerusalem (IST, UTC+2 / UTC+3), matching the UR audit.
--
-- Depends on classroom_memberships.is_rehearsal
-- (20261028140000_paid_campaign_funnel_and_rehearsal). A rehearsal seat is
-- the teacher's own phone test and does not count as a student.
-- =============================================

WITH signups AS (
  SELECT
    p.id,
    p.created_at,
    (p.created_at AT TIME ZONE 'Asia/Jerusalem')::date AS signup_day,
    COALESCE(NULLIF(TRIM(p.utm_campaign), ''), '(none)') AS utm_campaign,
    COALESCE(NULLIF(TRIM(p.utm_source), ''), '(none)') AS utm_source,
    p.user_role,
    p.last_seen_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE lower(trim(p.utm_medium)) = 'paid'
    AND p.created_at >= now() - interval '30 days'
    AND COALESCE(p.is_test_account, false) = false
    -- Email lives on auth.users, not profiles. Null email = guest; @lexiclash.test = QA.
    AND u.email IS NOT NULL
    AND u.email NOT ILIKE '%@lexiclash.test'
),
approved AS (
  SELECT DISTINCT user_id
  FROM public.teacher_access_requests
  WHERE status = 'approved' AND user_id IS NOT NULL
),
classes AS (
  SELECT DISTINCT teacher_id FROM public.classrooms
),
students AS (
  SELECT c.teacher_id, min(m.joined_at) AS first_student_at
  FROM public.classroom_memberships m
  JOIN public.classrooms c ON c.id = m.classroom_id
  WHERE m.student_id <> c.teacher_id
    AND COALESCE(m.is_rehearsal, false) = false
  GROUP BY c.teacher_id
),
rounds AS (
  SELECT teacher_id, min(completed_at) AS first_real_round_at
  FROM public.classroom_rounds
  WHERE player_count >= 2 AND completed_at IS NOT NULL
  GROUP BY teacher_id
)
SELECT
  s.signup_day,
  s.utm_campaign,
  s.utm_source,
  count(*) AS signups,
  count(*) FILTER (WHERE s.user_role = 'teacher') AS teachers,
  count(*) FILTER (WHERE a.user_id IS NOT NULL) AS access_approved,
  count(*) FILTER (WHERE c.teacher_id IS NOT NULL) AS classroom_created,
  count(*) FILTER (WHERE st.teacher_id IS NOT NULL) AS first_student,
  count(*) FILTER (WHERE r.teacher_id IS NOT NULL) AS first_real_round,
  count(*) FILTER (WHERE s.created_at <= now() - interval '1 day') AS d1_eligible,
  count(*) FILTER (WHERE s.created_at <= now() - interval '1 day' AND (
    s.last_seen_at >= s.created_at + interval '1 day'
    OR st.first_student_at >= s.created_at + interval '1 day'
    OR r.first_real_round_at >= s.created_at + interval '1 day'
  )) AS d1_returned,
  count(*) FILTER (WHERE s.created_at <= now() - interval '7 days') AS d7_eligible,
  count(*) FILTER (WHERE s.created_at <= now() - interval '7 days' AND (
    s.last_seen_at >= s.created_at + interval '7 days'
    OR st.first_student_at >= s.created_at + interval '7 days'
    OR r.first_real_round_at >= s.created_at + interval '7 days'
  )) AS d7_returned
FROM signups s
LEFT JOIN approved a ON a.user_id = s.id
LEFT JOIN classes c ON c.teacher_id = s.id
LEFT JOIN students st ON st.teacher_id = s.id
LEFT JOIN rounds r ON r.teacher_id = s.id
GROUP BY s.signup_day, s.utm_campaign, s.utm_source
ORDER BY s.signup_day DESC, s.utm_campaign;
