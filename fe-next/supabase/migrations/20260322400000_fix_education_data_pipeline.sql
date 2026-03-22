-- ============================================
-- Fix Education Data Pipeline (Sprint 1)
-- ============================================
-- B2: Drop broken prevent_direct_xp_update trigger
-- The trigger checks session_user = current_user to detect SECURITY DEFINER context,
-- but in Supabase both are 'authenticator', so it blocks ALL XP writes including
-- the legitimate award_education_xp RPC. RLS already prevents direct client writes.
-- ============================================

DROP TRIGGER IF EXISTS prevent_direct_xp_manipulation ON student_lesson_progress;
DROP FUNCTION IF EXISTS prevent_direct_xp_update();

-- ============================================
-- B3: Fix student_practice_progress view
-- The view only reads old 058 columns (practice_type, cards_reviewed, etc.)
-- and ignores new 20260213 columns (mode, words_attempted, words_correct).
-- Matching/spelling/blitz session counts are always 0.
-- ============================================

DROP VIEW IF EXISTS student_practice_progress;

CREATE OR REPLACE VIEW student_practice_progress AS
SELECT
  ps.student_id,
  ps.lesson_id,
  COUNT(*) AS total_sessions,
  COUNT(*) FILTER (WHERE ps.completed_at IS NOT NULL) AS completed_sessions,
  -- Aggregate by practice mode (handle both old and new column names)
  COUNT(*) FILTER (WHERE COALESCE(ps.practice_type, ps.mode) = 'flashcard' AND ps.completed_at IS NOT NULL) AS flashcard_sessions,
  COUNT(*) FILTER (WHERE COALESCE(ps.practice_type, ps.mode) = 'solo_board' AND ps.completed_at IS NOT NULL) AS board_sessions,
  COUNT(*) FILTER (WHERE COALESCE(ps.practice_type, ps.mode) = 'matching' AND ps.completed_at IS NOT NULL) AS matching_sessions,
  COUNT(*) FILTER (WHERE COALESCE(ps.practice_type, ps.mode) = 'spelling' AND ps.completed_at IS NOT NULL) AS spelling_sessions,
  COUNT(*) FILTER (WHERE COALESCE(ps.practice_type, ps.mode) = 'blitz' AND ps.completed_at IS NOT NULL) AS blitz_sessions,
  COUNT(*) FILTER (WHERE COALESCE(ps.practice_type, ps.mode) = 'warmup' AND ps.completed_at IS NOT NULL) AS warmup_sessions,
  COUNT(*) FILTER (WHERE COALESCE(ps.practice_type, ps.mode) = 'word_list' AND ps.completed_at IS NOT NULL) AS word_list_sessions,
  -- Score aggregates
  COALESCE(SUM(ps.total_score), 0) AS total_score,
  COALESCE(SUM(COALESCE(ps.cards_reviewed, ps.words_attempted, 0)), 0) AS total_words_attempted,
  COALESCE(SUM(COALESCE(ps.cards_correct, ps.words_correct, 0)), 0) AS total_words_correct,
  COALESCE(SUM(COALESCE(ps.time_spent_seconds, ps.duration_seconds, 0)), 0) AS total_time_seconds,
  COALESCE(SUM(ps.xp_awarded), 0) AS total_xp_awarded,
  -- Vocabulary words found (array aggregation)
  COALESCE(
    array_length(
      array_agg(DISTINCT unnested.word) FILTER (WHERE unnested.word IS NOT NULL),
      1
    ),
    0
  ) AS unique_vocabulary_words_found
FROM practice_sessions ps
LEFT JOIN LATERAL unnest(ps.vocabulary_words_found) AS unnested(word) ON true
GROUP BY ps.student_id, ps.lesson_id;

-- Grant access (matches existing pattern)
GRANT SELECT ON student_practice_progress TO authenticated;

-- ============================================
-- B18: Add missing index for teacher queries on word_review_state
-- ============================================

CREATE INDEX IF NOT EXISTS idx_word_review_state_lesson
  ON word_review_state(lesson_id);
