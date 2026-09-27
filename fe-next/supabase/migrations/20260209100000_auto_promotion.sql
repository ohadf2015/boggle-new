-- Auto-Promotion Pipeline
-- Adds tracking columns and RPC functions for automatic word promotion

-- Add tracking columns to invalid_word_submissions
ALTER TABLE invalid_word_submissions
  ADD COLUMN IF NOT EXISTS auto_promoted_by TEXT,
  ADD COLUMN IF NOT EXISTS auto_promoted_at TIMESTAMPTZ;

-- Partial index for efficient candidate lookups
CREATE INDEX IF NOT EXISTS idx_invalid_words_auto_promote
  ON invalid_word_submissions (submission_count DESC)
  WHERE reason = 'not_in_dictionary'
    AND approved_at IS NULL
    AND auto_promoted_at IS NULL;

-- RPC: Get auto-promotion candidates (submission-based)
CREATE OR REPLACE FUNCTION get_auto_promotion_candidates(
  p_min_submissions INT DEFAULT 10,
  p_limit INT DEFAULT 200
)
RETURNS TABLE (
  id UUID,
  word TEXT,
  language TEXT,
  submission_count INT,
  reason TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    iws.id,
    iws.word,
    iws.language,
    iws.submission_count,
    iws.reason
  FROM invalid_word_submissions iws
  WHERE iws.reason = 'not_in_dictionary'
    AND iws.approved_at IS NULL
    AND iws.auto_promoted_at IS NULL
    AND iws.submission_count >= p_min_submissions
  ORDER BY iws.submission_count DESC
  LIMIT p_limit;
$$;

-- RPC: Mark a word as auto-promoted
CREATE OR REPLACE FUNCTION mark_word_auto_promoted(
  p_word_id UUID,
  p_source TEXT
)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE invalid_word_submissions
  SET
    approved_at = NOW(),
    auto_promoted_by = p_source,
    auto_promoted_at = NOW()
  WHERE id = p_word_id;
$$;
