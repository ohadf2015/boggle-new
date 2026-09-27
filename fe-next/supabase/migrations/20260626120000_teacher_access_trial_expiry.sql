-- =============================================
-- TEACHER ACCESS — trial window on approval.
-- Migration: 20260626120000_teacher_access_trial_expiry
--
-- WHY THIS EXISTS
-- Teacher access is now granted as a time-limited trial. On approval the API
-- stamps a deadline so the confirmation email and the teacher UI can drive
-- activation urgency ("your trial is live now — don't miss it"). This adds the
-- column the approve/resend routes write and the GET /api/education/access-request
-- read surfaces to the client.
--
-- SOFT MODEL (intentional): this is metadata for urgency/countdown only — no
-- role is auto-revoked when the deadline passes. Hard enforcement (a pg_cron
-- job that revokes user_role='teacher') is deliberately NOT included here to
-- avoid locking out active teachers; it can be layered on later.
--
-- Idempotent (ADD COLUMN IF NOT EXISTS) — safe no-op where already applied.
-- No RLS change: the existing select/update policies already cover these
-- columns. Not added to supabase_realtime (no consumer) — see
-- .claude/rules/50-supabase-perf.md.
-- =============================================

ALTER TABLE public.teacher_access_requests
  ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;

ALTER TABLE public.teacher_access_allowlist
  ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN public.teacher_access_requests.trial_expires_at IS
  'Trial deadline stamped at approval. Drives email/UI urgency; not auto-enforced.';
COMMENT ON COLUMN public.teacher_access_allowlist.trial_expires_at IS
  'Trial deadline carried to the signup bridge for anonymous applicants.';
