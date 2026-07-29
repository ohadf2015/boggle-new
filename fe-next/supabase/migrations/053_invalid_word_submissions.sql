-- =============================================
-- INVALID WORD SUBMISSIONS TABLE
-- Migration: 053_invalid_word_submissions
-- Created: 2026-01-22
--
-- Track invalid word submissions with counters.
-- Admins can view words submitted 3+ times and approve them
-- to add to community validation (word_scores).
-- =============================================

-- =============================================
-- INVALID_WORD_SUBMISSIONS TABLE
-- Track words that players submitted but failed validation
-- =============================================
CREATE TABLE IF NOT EXISTS invalid_word_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',

    -- Submission tracking
    submission_count INTEGER DEFAULT 1,
    reason TEXT CHECK (reason IN ('not_on_board', 'not_in_dictionary', 'peer_rejected')),

    -- Timestamps
    first_submitted_at TIMESTAMPTZ DEFAULT NOW(),
    last_submitted_at TIMESTAMPTZ DEFAULT NOW(),

    -- Approval tracking
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint on word + language
    CONSTRAINT unique_invalid_word_language UNIQUE (word, language)
);

-- =============================================
-- INDEXES
-- =============================================

-- For filtering by language and sorting by count
CREATE INDEX IF NOT EXISTS idx_invalid_words_language_count
    ON invalid_word_submissions(language, submission_count DESC);

-- For admin view: pending words with high submission count
CREATE INDEX IF NOT EXISTS idx_invalid_words_pending
    ON invalid_word_submissions(submission_count DESC)
    WHERE approved_at IS NULL AND submission_count >= 3;

-- For word lookup
CREATE INDEX IF NOT EXISTS idx_invalid_words_word
    ON invalid_word_submissions(word);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
DROP TRIGGER IF EXISTS invalid_word_submissions_updated_at ON invalid_word_submissions;
CREATE TRIGGER invalid_word_submissions_updated_at
    BEFORE UPDATE ON invalid_word_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- RPC FUNCTION: Record Invalid Word Submission
-- Upserts word with atomic increment on conflict
-- =============================================
CREATE OR REPLACE FUNCTION record_invalid_word_submission(
    p_word TEXT,
    p_language TEXT,
    p_reason TEXT DEFAULT 'not_in_dictionary'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO invalid_word_submissions (word, language, reason, submission_count)
    VALUES (LOWER(TRIM(p_word)), LOWER(TRIM(p_language)), p_reason, 1)
    ON CONFLICT (word, language) DO UPDATE SET
        submission_count = invalid_word_submissions.submission_count + 1,
        last_submitted_at = NOW(),
        updated_at = NOW(),
        -- Update reason to most recent if provided
        reason = COALESCE(EXCLUDED.reason, invalid_word_submissions.reason);
END;
$$;

-- Grant execute to authenticated users (called via service role from backend)
GRANT EXECUTE ON FUNCTION record_invalid_word_submission TO authenticated;
GRANT EXECUTE ON FUNCTION record_invalid_word_submission TO service_role;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS
ALTER TABLE invalid_word_submissions ENABLE ROW LEVEL SECURITY;

-- Admins can view all invalid word submissions
DROP POLICY IF EXISTS "Admins can view invalid word submissions" ON invalid_word_submissions;
CREATE POLICY "Admins can view invalid word submissions"
    ON invalid_word_submissions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- Service role can insert/update (from backend)
DROP POLICY IF EXISTS "Service role can manage invalid word submissions" ON invalid_word_submissions;
CREATE POLICY "Service role can manage invalid word submissions"
    ON invalid_word_submissions FOR ALL
    USING (true)
    WITH CHECK (true);

-- Admins can update (for approval)
DROP POLICY IF EXISTS "Admins can approve invalid word submissions" ON invalid_word_submissions;
CREATE POLICY "Admins can approve invalid word submissions"
    ON invalid_word_submissions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE invalid_word_submissions IS 'Tracks invalid word submissions with counters. Words submitted 3+ times appear in admin review.';
COMMENT ON COLUMN invalid_word_submissions.submission_count IS 'Number of times this word has been submitted and rejected';
COMMENT ON COLUMN invalid_word_submissions.reason IS 'Why the word was invalid: not_on_board, not_in_dictionary, or peer_rejected';
COMMENT ON COLUMN invalid_word_submissions.approved_at IS 'When admin approved this word (NULL = pending)';
COMMENT ON COLUMN invalid_word_submissions.approved_by IS 'Admin who approved this word';
COMMENT ON FUNCTION record_invalid_word_submission IS 'Upserts invalid word submission with atomic counter increment';
