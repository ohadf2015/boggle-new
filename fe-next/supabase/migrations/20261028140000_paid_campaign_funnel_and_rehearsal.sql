-- Paid campaign funnel readout + rehearsal seat (t_dc68f166).
-- Read-only function for the admin insights row. The column marks a teacher's
-- own phone test-student so it cannot trip the e334c5c8 >=2-player trial clock.
-- NOT added to supabase_realtime (no consumer).

ALTER TABLE public.classroom_memberships
  ADD COLUMN IF NOT EXISTS is_rehearsal BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.classroom_memberships.is_rehearsal IS
  'Phone test-student seat from the paid day-0 screen. Excluded from the >=2-player trial clock and from first-student counts (t_dc68f166).';

CREATE INDEX IF NOT EXISTS classroom_memberships_rehearsal_idx
  ON public.classroom_memberships (classroom_id)
  WHERE is_rehearsal;

CREATE OR REPLACE FUNCTION public.admin_paid_campaign_funnel(p_days INT DEFAULT 14)
RETURNS JSON
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH bounds AS (
  SELECT GREATEST(1, LEAST(COALESCE(p_days, 14), 90)) AS days
),
signups AS (
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
  CROSS JOIN bounds b
  WHERE lower(trim(p.utm_medium)) = 'paid'
    AND p.created_at >= now() - make_interval(days => b.days)
    AND COALESCE(p.is_test_account, false) = false
    -- Email and anonymous live on auth.users, not profiles. A null email is a
    -- guest student; @lexiclash.test is the QA convention (also flagged on profiles).
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
),
grouped AS (
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
)
SELECT COALESCE(
  json_agg(json_build_object(
    'signupDay', signup_day,
    'utmCampaign', utm_campaign,
    'utmSource', utm_source,
    'signups', signups,
    'teachers', teachers,
    'accessApproved', access_approved,
    'classroomCreated', classroom_created,
    'firstStudent', first_student,
    'firstRealRound', first_real_round,
    'd1Eligible', d1_eligible,
    'd1Returned', d1_returned,
    'd7Eligible', d7_eligible,
    'd7Returned', d7_returned
  ) ORDER BY signup_day DESC, utm_campaign),
  '[]'::json
)
FROM grouped;
$$;

REVOKE ALL ON FUNCTION public.admin_paid_campaign_funnel(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_paid_campaign_funnel(INT) TO service_role;
