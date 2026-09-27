-- =============================================
-- Adventure Mode: Performance Index
-- Migration: 064_adventure_performance_index
-- Description: Add composite covering index for faster level completion lookups
-- =============================================

-- Add composite covering index for the common query pattern:
-- SELECT * FROM level_completions WHERE user_id = X ORDER BY world, level
-- This index covers user_id + world + level for O(1) lookups
-- and supports the ORDER BY clause without an additional sort operation

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_level_completions_user_world_level
    ON level_completions(user_id, world, level);

-- Note: Using CONCURRENTLY to avoid locking the table during index creation
-- This is safe for production use as it won't block reads or writes

COMMENT ON INDEX idx_level_completions_user_world_level IS
    'Composite covering index for fast level completion lookups by user with world/level ordering';
