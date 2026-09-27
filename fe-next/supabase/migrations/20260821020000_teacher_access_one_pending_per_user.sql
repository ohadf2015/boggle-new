-- =============================================
-- TEACHER ACCESS — one pending request per user.
-- Migration: 20260821020000_teacher_access_one_pending_per_user
--
-- WHY THIS EXISTS / WHAT IT FIXES
-- On 2026-08-20 two real applicants each landed TWO rows in
-- teacher_access_requests (standardskillsacademy@gmail.com twice 3s apart —
-- a double-submit — and marialcr29@gmail.com twice 51s apart). The admin
-- queue showed each pair as separate applicants. The access-request API
-- approves instantly in the same request, so a row is 'pending' only for the
-- duration of one request — but two CONCURRENT requests both insert before
-- either one approves, and nothing in the schema stops it. The client
-- disabling its submit button is UX, not a guarantee; the database has to be
-- the idempotency guard.
--
-- WHAT IT DOES
-- At most ONE status='pending' row per user_id. A concurrent duplicate
-- insert fails with 23505 and the API route treats that as "the first
-- request's row is canonical" and approves it — a double-submit converges on
-- exactly one row, one approval, one email set.
--
-- WHAT IT DOES NOT DO
-- - Re-application after a DECLINE is unaffected: declined (and approved)
--   rows are not 'pending', so the index never blocks a legitimate re-apply.
-- - Rows with NULL user_id (legacy/anon inserts) never conflict — Postgres
--   treats NULLs as distinct in unique indexes.
--
-- APPLY NOTE: if production currently holds any user with 2+ pending rows,
-- CREATE UNIQUE INDEX fails — dedupe those rows first, then re-apply. (With
-- instant-approve the steady state should be zero pending rows.)
-- =============================================

CREATE UNIQUE INDEX IF NOT EXISTS uniq_tar_one_pending_per_user
  ON public.teacher_access_requests (user_id)
  WHERE status = 'pending';
