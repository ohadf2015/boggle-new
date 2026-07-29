-- Migration: 020_reload_schema_cache.sql
-- Description: Reload Supabase PostgREST schema cache to fix stale cache issues
-- Fixes: JAVASCRIPT-NEXTJS-9P (Missing assigned_by column error)
-- Dependencies: None (pure cache reload)

-- ============================================
-- SCHEMA CACHE RELOAD
-- ============================================
-- This migration reloads the PostgREST schema cache without making any schema changes.
-- Fixes Sentry issue JAVASCRIPT-NEXTJS-9P where PostgREST cache thought lesson_assignments
-- had an 'assigned_by' column that doesn't exist in the actual schema.

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the lesson_assignments table structure (for documentation)
COMMENT ON TABLE lesson_assignments IS 'Assigns vocabulary lessons to specific classrooms. Schema reloaded 2026-01-26 to fix PostgREST cache issue.';
