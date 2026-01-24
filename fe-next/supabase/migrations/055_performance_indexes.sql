-- =============================================
-- PERFORMANCE INDEXES
-- Migration: 055_performance_indexes
-- Created: 2026-01-24
--
-- Additional indexes for performance optimization
-- Based on performance audit findings
-- =============================================

-- Index for filtering invalid word submissions by word, language, and sorting by date
-- Optimizes queries that look up words across languages with temporal ordering
CREATE INDEX IF NOT EXISTS idx_invalid_words_word_lang_date
    ON invalid_word_submissions(word, language, created_at DESC);

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON INDEX idx_invalid_words_word_lang_date IS 'Optimizes word lookup across languages with date ordering';
