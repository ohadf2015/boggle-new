-- Per-admin "seen up to" marker for the admin bell. Unread = notifications newer than
-- the caller's seen_at, so one admin opening the bell never clears it for another.
-- Service role only (RLS on, no policies); read through /api/admin/notifications.

CREATE TABLE IF NOT EXISTS public.admin_notification_seen (
  admin_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  seen_at timestamptz NOT NULL
);

ALTER TABLE public.admin_notification_seen ENABLE ROW LEVEL SECURITY;
