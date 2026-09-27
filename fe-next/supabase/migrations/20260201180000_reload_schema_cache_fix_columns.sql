-- Migration: 020_reload_schema_cache_fix_columns.sql
-- Description: Reload Supabase PostgREST schema cache to fix stale cache issues
-- Fixes:
--   - JAVASCRIPT-NEXTJS-F1 (Missing current_streak column in student_lesson_progress)
--   - JAVASCRIPT-NEXTJS-F0, JAVASCRIPT-NEXTJS-DW (Missing unique_days_played column in profiles)
-- Dependencies:
--   - 062_education_xp_tracking.sql (adds current_streak to student_lesson_progress)
--   - 038_add_unique_days_played.sql (adds unique_days_played to profiles)

-- ============================================
-- SCHEMA CACHE RELOAD
-- ============================================
-- This migration reloads the PostgREST schema cache without making any schema changes.
-- Fixes Sentry issues where PostgREST cache is missing recently added columns:
--   1. student_lesson_progress.current_streak (added in migration 062)
--   2. profiles.unique_days_played (added in migration 038)

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the columns exist (for documentation)
COMMENT ON COLUMN student_lesson_progress.current_streak IS 'Consecutive days of practice. Schema cache reloaded 2026-02-01 to fix PostgREST cache issue (Sentry F1).';
COMMENT ON COLUMN profiles.unique_days_played IS 'Number of unique calendar days the user has played games. Schema cache reloaded 2026-02-01 to fix PostgREST cache issue (Sentry F0, DW).';
