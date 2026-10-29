-- =============================================
-- TEACHER PRO TRIAL CHECKLIST — persist dismiss and completion.
-- Migration: 20261027190000_teacher_trial_checklist
--
-- Day-0 activation checklist for Polar Teacher Pro trial teachers on
-- Teacher HQ. Two nullable timestamps on profiles; flags only turn on.
-- NOT added to supabase_realtime (no consumer; a realtime publication
-- without a subscriber burns DB CPU).
-- =============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS teacher_trial_checklist_dismissed_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS teacher_trial_checklist_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.teacher_trial_checklist_dismissed_at IS
  'When the teacher dismissed the Teacher Pro Day-0 trial activation checklist on HQ.';

COMMENT ON COLUMN public.profiles.teacher_trial_checklist_completed_at IS
  'When all 3 steps of the Teacher Pro Day-0 trial activation checklist were first completed; never cleared.';
