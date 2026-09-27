-- Which trial-expiry emails a teacher has already been sent.
--
-- The ledger lives on the row, not in the cron schedule: /api/cron/teacher-trial-reminders
-- appends a bucket ('t-3' | 't-0' | 't+3') only after a confirmed send, so a double
-- run, a retry after a Resend failure, or a catch-up after a missed day never
-- emails the same teacher the same thing twice.

ALTER TABLE public.teacher_access_requests
  ADD COLUMN IF NOT EXISTS trial_reminders_sent TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.teacher_access_requests.trial_reminders_sent IS
  'Trial-expiry reminder buckets already emailed to this teacher (t-3 / t-0 / t+3).';
