-- Migration: Fix pg_cron configuration parameter error
-- Date: 2026-01-27
-- Issue: pg_cron jobs trying to access undefined app.settings.supabase_url

-- Set the app settings parameter that pg_cron is trying to access
-- This prevents the "unrecognized configuration parameter" error in logs
-- Note: Using the actual Supabase project URL directly
ALTER DATABASE postgres SET app.settings.supabase_url TO 'https://hdtmpkicuxvtmvrmtybx.supabase.co';

-- Verify the setting was applied
SELECT current_setting('app.settings.supabase_url', true) as supabase_url_setting;

-- Comment explaining the fix
COMMENT ON DATABASE postgres IS 'Contains app.settings.supabase_url for pg_cron compatibility';
