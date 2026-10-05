-- =============================================
-- TEACHER ACTIVATION CHECKLIST — persist copy / live-start / dismiss.
-- Migration: 20261005120000_teacher_activation_progress
--
-- First-run HQ checklist for newly approved teachers. Completions must
-- survive reload (not localStorage). Three nullable timestamps on profiles;
-- flags only turn on. NOT added to supabase_realtime (no consumer).
-- =============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS teacher_activation_invite_copied_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS teacher_activation_live_started_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS teacher_activation_checklist_dismissed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.teacher_activation_invite_copied_at IS
  'When the teacher copied the student invite from the activation checklist.';
COMMENT ON COLUMN public.profiles.teacher_activation_live_started_at IS
  'When the teacher started a live class from the activation checklist.';
COMMENT ON COLUMN public.profiles.teacher_activation_checklist_dismissed_at IS
  'When the teacher dismissed the completed activation checklist (trial CTA).';
