-- Migration 039: Add performance indexes for daily_buzz_challenges table
-- Purpose: Optimize lookup queries and recent trends filtering
--
-- Bottlenecks before this migration:
-- 1. remove-image, regenerate, getDailyBuzz() all do (puzzle_date, language, region) lookups (no index)
-- 2. getRecentlyUsedTrends() scans entire table filtering by language and ordering by date (no index)
--
-- Expected performance improvements:
-- - remove-image: ~10s → ~1-2s (10x faster)
-- - getDailyBuzz(): ~1-3s → ~100-300ms (5-10x faster)
-- - getRecentlyUsedTrends(): ~2-5s → ~200-500ms (10x faster)

-- Primary lookup index (used by all CRUD operations)
-- Covers queries: WHERE puzzle_date = ? AND language = ? AND region = ?
CREATE INDEX IF NOT EXISTS idx_daily_buzz_challenges_lookup
  ON daily_buzz_challenges(puzzle_date, language, region);

-- Recent trends query optimization
-- Covers query: WHERE language = ? ORDER BY puzzle_date DESC LIMIT ?
-- Used by getRecentlyUsedTrends() in buzzGenerator.ts
CREATE INDEX IF NOT EXISTS idx_daily_buzz_challenges_recent
  ON daily_buzz_challenges(language, puzzle_date DESC);

-- Feature flags lookup optimization (used in every generation check)
CREATE INDEX IF NOT EXISTS idx_feature_flags_name
  ON feature_flags(flag_name)
  WHERE is_enabled = true;

-- Comments for future maintainers
COMMENT ON INDEX idx_daily_buzz_challenges_lookup IS
  'Composite index for primary challenge lookups. Used by getDailyBuzz(), storeDailyBuzz(), deleteDailyBuzz(), and all admin endpoints.';

COMMENT ON INDEX idx_daily_buzz_challenges_recent IS
  'Descending date index for getRecentlyUsedTrends() query. Allows fast scanning of recent challenges by language without full table scan.';

COMMENT ON INDEX idx_feature_flags_name IS
  'Partial index for active feature flags. Only indexes enabled flags to reduce index size and improve cache hit rate.';
