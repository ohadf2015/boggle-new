-- Fix Realtime row-level filtering for user_notifications table
-- Issue: Sentry errors showing "configuration mismatch" because replica identity is "default"
-- Solution: Set replica identity to FULL so user_id column is included in change events
--
-- When using Supabase Realtime with row-level filtering (e.g., filter: `user_id=eq.${userId}`),
-- the table needs REPLICA IDENTITY FULL so that all columns are included in the WAL events.
-- With the default replica identity, only the primary key is included, preventing filtering.

-- Set replica identity to FULL for proper row-level filtering
ALTER TABLE public.user_notifications REPLICA IDENTITY FULL;

-- Add a comment explaining why this is needed
COMMENT ON TABLE public.user_notifications IS 'User notifications with REPLICA IDENTITY FULL for Supabase Realtime row-level filtering on user_id column';
