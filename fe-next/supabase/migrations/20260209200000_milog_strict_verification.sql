-- =============================================
-- STRICTER MILOG VERIFICATION + WORD TYPE TRACKING
-- Migration: 20260209200000_milog_strict_verification
-- Created: 2026-02-09
--
-- Adds word type classification to reject abbreviations and proper names.
-- Updates RPC to accept word type and rejected reason parameters.
-- =============================================

-- =============================================
-- ADD WORD TYPE COLUMNS
-- =============================================

ALTER TABLE invalid_word_submissions
ADD COLUMN IF NOT EXISTS milog_word_type TEXT;

ALTER TABLE invalid_word_submissions
ADD COLUMN IF NOT EXISTS milog_rejected_reason TEXT;

-- =============================================
-- UPDATE CHECK CONSTRAINT TO INCLUDE rejected_type
-- =============================================

-- Drop existing constraint (added in 20260205100000)
ALTER TABLE invalid_word_submissions
DROP CONSTRAINT IF EXISTS invalid_word_submissions_milog_status_check;

-- Re-add with rejected_type included
ALTER TABLE invalid_word_submissions
ADD CONSTRAINT invalid_word_submissions_milog_status_check
CHECK (milog_status IN ('pending', 'verified', 'not_found', 'error', 'rejected_type'));

-- Index for rejected_type words (for admin review)
CREATE INDEX IF NOT EXISTS idx_invalid_words_milog_rejected_type
    ON invalid_word_submissions(milog_verified_at DESC)
    WHERE language = 'he'
    AND milog_status = 'rejected_type';

-- =============================================
-- UPDATE RPC: update_milog_verification
-- Now accepts word type and rejected reason
-- =============================================
CREATE OR REPLACE FUNCTION update_milog_verification(
    p_word_id UUID,
    p_status TEXT,
    p_url TEXT DEFAULT NULL,
    p_error TEXT DEFAULT NULL,
    p_word_type TEXT DEFAULT NULL,
    p_rejected_reason TEXT DEFAULT NULL
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
        milog_word_type = p_word_type,
        milog_rejected_reason = p_rejected_reason,
        updated_at = NOW()
    WHERE id = p_word_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_milog_verification TO service_role;

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON COLUMN invalid_word_submissions.milog_word_type IS 'Word grammatical type from Milog (noun, verb, abbreviation, etc.)';
COMMENT ON COLUMN invalid_word_submissions.milog_rejected_reason IS 'Reason for rejection if word type is not accepted for gameplay';
