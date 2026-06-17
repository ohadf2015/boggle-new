-- =============================================
-- SEED: pending teacher-access request for Anthony Rettig.
-- Migration: 20260617120100_seed_teacher_access_anthony_rettig
--
-- WHY
-- This applicant hit the "Something went wrong" submit error caused by the
-- broken anon-INSERT RLS policy (fixed in 20260617120000), so their request
-- never landed in the table and never reached the admin queue. This backfills
-- the request they tried to submit so an admin can approve it in the dashboard
-- at /admin/teacher-access. user_id is NULL (anonymous applicant), so the
-- approve route writes their email to teacher_access_allowlist; the role
-- upgrade then happens via the post-signup consume bridge when they sign up
-- with this email.
--
-- Values transcribed from the applicant's submission:
--   name:    Anthony Rettig
--   email:   anthony.r.rettig@mcpsmd.net
--   role:    teacher
--   school:  Baker Middle School
--   country: United States
--   use:     Site Word Builder
--
-- Idempotent: only inserts if no row for this email already exists, so re-runs
-- (or a later real submission via the now-fixed form) will not create a dup.
-- =============================================

INSERT INTO public.teacher_access_requests
  (user_id, email, full_name, school_or_org, country, role, locale, use_case, status)
SELECT
  NULL,
  'anthony.r.rettig@mcpsmd.net',
  'Anthony Rettig',
  'Baker Middle School',
  'United States',
  'teacher',
  'en',
  'Site Word Builder',
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM public.teacher_access_requests
  WHERE email = 'anthony.r.rettig@mcpsmd.net'
);
