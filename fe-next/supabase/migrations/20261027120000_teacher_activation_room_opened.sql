-- =============================================
-- TEACHER ACTIVATION — split "room opened" from "ran a live game".
-- Migration: 20261027120000_teacher_activation_room_opened
--
-- teacher_activation_live_started_at was stamped when the teacher CREATED
-- the room (minutes after signup, 0 students), so the onboarding checklist
-- stopped nudging teachers who never actually taught a round. From here on
-- live_started is stamped by the backend only when the teacher's FIRST
-- classroom round with player_count >= 2 completes (same predicate as the
-- access-trial clock). Room creation is still recorded, under its own
-- honest name. NOT added to supabase_realtime (no consumer).
-- =============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS teacher_activation_room_opened_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.teacher_activation_room_opened_at IS
  'When the teacher first opened a live room (created a classroom game), regardless of whether anyone joined.';

COMMENT ON COLUMN public.profiles.teacher_activation_live_started_at IS
  'When the teacher''s first live classroom round with 2+ real players completed. Stamped by the backend only; NULL for teachers who opened a room but never ran a real round.';
