-- =============================================
-- MILOG WORD VERIFICATION SYSTEM
-- Migration: 20260205100000_milog_word_verification
-- Created: 2026-02-05
--
-- Extends invalid_word_submissions with milog.co.il verification.
-- Background job verifies Hebrew words and auto-promotes if found.
-- =============================================

-- =============================================
-- ADD VERIFICATION COLUMNS TO INVALID_WORD_SUBMISSIONS
-- =============================================

-- Verification status: pending, verified, not_found, error
ALTER TABLE invalid_word_submissions
ADD COLUMN IF NOT EXISTS milog_status TEXT DEFAULT 'pending'
CHECK (milog_status IN ('pending', 'verified', 'not_found', 'error'));

-- When verification was attempted
ALTER TABLE invalid_word_submissions
ADD COLUMN IF NOT EXISTS milog_verified_at TIMESTAMPTZ;

-- Number of verification attempts (for retry logic)
ALTER TABLE invalid_word_submissions
ADD COLUMN IF NOT EXISTS milog_attempts INTEGER DEFAULT 0;

-- Error message if verification failed
ALTER TABLE invalid_word_submissions
ADD COLUMN IF NOT EXISTS milog_error TEXT;

-- URL where word was found (for reference)
ALTER TABLE invalid_word_submissions
ADD COLUMN IF NOT EXISTS milog_url TEXT;

-- =============================================
-- INDEXES FOR VERIFICATION QUEUE
-- =============================================

-- For fetching pending Hebrew words for verification
CREATE INDEX IF NOT EXISTS idx_invalid_words_milog_pending
    ON invalid_word_submissions(milog_attempts, submission_count DESC)
    WHERE language = 'he'
    AND milog_status = 'pending'
    AND approved_at IS NULL;

-- For tracking verified words ready for promotion
CREATE INDEX IF NOT EXISTS idx_invalid_words_milog_verified
    ON invalid_word_submissions(milog_verified_at DESC)
    WHERE language = 'he'
    AND milog_status = 'verified'
    AND approved_at IS NULL;

-- =============================================
-- RPC FUNCTION: Get Words Pending Milog Verification
-- Returns batch of Hebrew words to verify
-- =============================================
CREATE OR REPLACE FUNCTION get_milog_verification_queue(
    p_batch_size INTEGER DEFAULT 50,
    p_min_submissions INTEGER DEFAULT 1,
    p_max_attempts INTEGER DEFAULT 3
)
RETURNS TABLE (
    id UUID,
    word TEXT,
    submission_count INTEGER,
    milog_attempts INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        iws.id,
        iws.word,
        iws.submission_count,
        iws.milog_attempts
    FROM invalid_word_submissions iws
    WHERE iws.language = 'he'
    AND iws.milog_status = 'pending'
    AND iws.approved_at IS NULL
    AND iws.submission_count >= p_min_submissions
    AND iws.milog_attempts < p_max_attempts
    ORDER BY iws.submission_count DESC, iws.first_submitted_at ASC
    LIMIT p_batch_size;
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION get_milog_verification_queue TO service_role;

-- =============================================
-- RPC FUNCTION: Update Milog Verification Result
-- Called by background job after verification
-- =============================================
CREATE OR REPLACE FUNCTION update_milog_verification(
    p_word_id UUID,
    p_status TEXT,
    p_url TEXT DEFAULT NULL,
    p_error TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE invalid_word_submissions
    SET
        milog_status = p_status,
        milog_verified_at = NOW(),
        milog_attempts = milog_attempts + 1,
        milog_url = p_url,
        milog_error = p_error,
        updated_at = NOW()
    WHERE id = p_word_id;
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION update_milog_verification TO service_role;

-- =============================================
-- RPC FUNCTION: Get Verified Words for Promotion
-- Returns words verified on milog but not yet in dictionary
-- =============================================
CREATE OR REPLACE FUNCTION get_milog_verified_words(
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    word TEXT,
    submission_count INTEGER,
    milog_url TEXT,
    milog_verified_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        iws.id,
        iws.word,
        iws.submission_count,
        iws.milog_url,
        iws.milog_verified_at
    FROM invalid_word_submissions iws
    WHERE iws.language = 'he'
    AND iws.milog_status = 'verified'
    AND iws.approved_at IS NULL
    ORDER BY iws.milog_verified_at ASC
    LIMIT p_limit;
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION get_milog_verified_words TO service_role;

-- =============================================
-- RPC FUNCTION: Mark Word as Promoted to Dictionary
-- Called after word is added to dictionary file
-- =============================================
CREATE OR REPLACE FUNCTION mark_word_promoted_to_dictionary(
    p_word_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE invalid_word_submissions
    SET
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_word_id;
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION mark_word_promoted_to_dictionary TO service_role;

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON COLUMN invalid_word_submissions.milog_status IS 'Milog verification status: pending, verified, not_found, error';
COMMENT ON COLUMN invalid_word_submissions.milog_verified_at IS 'When milog verification was last attempted';
COMMENT ON COLUMN invalid_word_submissions.milog_attempts IS 'Number of verification attempts (for retry logic)';
COMMENT ON COLUMN invalid_word_submissions.milog_url IS 'URL where word was found on milog.co.il';
COMMENT ON COLUMN invalid_word_submissions.milog_error IS 'Error message if verification failed';

COMMENT ON FUNCTION get_milog_verification_queue IS 'Returns batch of Hebrew words pending milog.co.il verification';
COMMENT ON FUNCTION update_milog_verification IS 'Updates milog verification result for a word';
COMMENT ON FUNCTION get_milog_verified_words IS 'Returns milog-verified words not yet promoted to dictionary';
COMMENT ON FUNCTION mark_word_promoted_to_dictionary IS 'Marks word as promoted after adding to dictionary file';
