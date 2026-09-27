-- =============================================
-- ADD WORD APPEAL TRACKING
-- Migration: 20260316100000_add_word_appeal_tracking
--
-- Adds player appeal tracking to invalid_word_submissions.
-- Players can appeal rejected words in multiplayer results,
-- which bumps appeal count and flags for admin review.
-- =============================================

-- Add appeal tracking columns
ALTER TABLE invalid_word_submissions
    ADD COLUMN IF NOT EXISTS player_appeal_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS first_appealed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_appealed_at TIMESTAMPTZ;

-- Index for admin queue: prioritize appealed words
CREATE INDEX IF NOT EXISTS idx_invalid_words_appealed
    ON invalid_word_submissions(player_appeal_count DESC)
    WHERE approved_at IS NULL AND player_appeal_count > 0;

-- RPC function for recording player appeals
CREATE OR REPLACE FUNCTION record_word_appeal(
    p_word TEXT,
    p_language TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- First ensure the word exists in invalid_word_submissions
    INSERT INTO invalid_word_submissions (word, language, reason, submission_count, player_appeal_count, first_appealed_at, last_appealed_at)
    VALUES (LOWER(TRIM(p_word)), LOWER(TRIM(p_language)), 'not_in_dictionary', 1, 1, NOW(), NOW())
    ON CONFLICT (word, language) DO UPDATE SET
        player_appeal_count = invalid_word_submissions.player_appeal_count + 1,
        last_appealed_at = NOW(),
        first_appealed_at = COALESCE(invalid_word_submissions.first_appealed_at, NOW()),
        updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION record_word_appeal TO authenticated;
GRANT EXECUTE ON FUNCTION record_word_appeal TO service_role;

COMMENT ON COLUMN invalid_word_submissions.player_appeal_count IS 'Number of times players appealed this word from results';
COMMENT ON COLUMN invalid_word_submissions.first_appealed_at IS 'When first player appealed this word';
COMMENT ON COLUMN invalid_word_submissions.last_appealed_at IS 'Most recent player appeal';
COMMENT ON FUNCTION record_word_appeal IS 'Records a player appeal for a rejected word, upserting into invalid_word_submissions';
