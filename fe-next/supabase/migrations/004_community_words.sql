-- =============================================
-- COMMUNITY WORDS TABLE
-- Migration: 004_community_words
-- Stores words that hosts validated but weren't in the dictionary
-- =============================================

-- =============================================
-- COMMUNITY_WORDS TABLE
-- Track host-approved words that weren't in original dictionary
-- =============================================
CREATE TABLE IF NOT EXISTS community_words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',

    -- Approval tracking
    approval_count INTEGER DEFAULT 1,
    promoted_to_dictionary BOOLEAN DEFAULT FALSE,
    promoted_at TIMESTAMPTZ,

    -- First approval info
    first_approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    first_approved_in_game TEXT,
    first_approved_at TIMESTAMPTZ DEFAULT NOW(),

    -- Last approval info
    last_approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    last_approved_in_game TEXT,
    last_approved_at TIMESTAMPTZ DEFAULT NOW(),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint on word + language
    CONSTRAINT unique_word_language UNIQUE (word, language)
);

-- =============================================
-- COMMUNITY_WORD_APPROVALS TABLE
-- Track individual approval events (for audit/analytics)
-- =============================================
CREATE TABLE IF NOT EXISTS community_word_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word_id UUID NOT NULL REFERENCES community_words(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    game_code TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_community_words_word ON community_words(word);
CREATE INDEX IF NOT EXISTS idx_community_words_language ON community_words(language);
CREATE INDEX IF NOT EXISTS idx_community_words_word_language ON community_words(word, language);
CREATE INDEX IF NOT EXISTS idx_community_words_approval_count ON community_words(approval_count DESC);
CREATE INDEX IF NOT EXISTS idx_community_words_promoted ON community_words(promoted_to_dictionary) WHERE promoted_to_dictionary = TRUE;
CREATE INDEX IF NOT EXISTS idx_community_words_not_promoted ON community_words(language, approval_count DESC) WHERE promoted_to_dictionary = FALSE;

CREATE INDEX IF NOT EXISTS idx_community_word_approvals_word_id ON community_word_approvals(word_id);
CREATE INDEX IF NOT EXISTS idx_community_word_approvals_game ON community_word_approvals(game_code);
CREATE INDEX IF NOT EXISTS idx_community_word_approvals_user ON community_word_approvals(approved_by);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
DROP TRIGGER IF EXISTS community_words_updated_at ON community_words;
CREATE TRIGGER community_words_updated_at
    BEFORE UPDATE ON community_words
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on both tables
ALTER TABLE community_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_word_approvals ENABLE ROW LEVEL SECURITY;

-- Community words are viewable by everyone (public dictionary expansion)
DROP POLICY IF EXISTS "Community words are viewable by everyone" ON community_words;
CREATE POLICY "Community words are viewable by everyone"
    ON community_words FOR SELECT
    USING (true);

-- Server can insert community words (via service role from backend)
DROP POLICY IF EXISTS "Server can insert community words" ON community_words;
CREATE POLICY "Server can insert community words"
    ON community_words FOR INSERT
    WITH CHECK (true);

-- Server can update community words (for approval count, promotion)
DROP POLICY IF EXISTS "Server can update community words" ON community_words;
CREATE POLICY "Server can update community words"
    ON community_words FOR UPDATE
    USING (true);

-- Community words cannot be deleted (preserve history)
DROP POLICY IF EXISTS "Community words cannot be deleted" ON community_words;
CREATE POLICY "Community words cannot be deleted"
    ON community_words FOR DELETE
    USING (false);

-- Community word approvals are viewable by everyone (transparency)
DROP POLICY IF EXISTS "Community word approvals are viewable" ON community_word_approvals;
CREATE POLICY "Community word approvals are viewable"
    ON community_word_approvals FOR SELECT
    USING (true);

-- Server can insert approval records
DROP POLICY IF EXISTS "Server can insert approvals" ON community_word_approvals;
CREATE POLICY "Server can insert approvals"
    ON community_word_approvals FOR INSERT
    WITH CHECK (true);

-- Approvals are immutable
DROP POLICY IF EXISTS "Approvals are immutable" ON community_word_approvals;
CREATE POLICY "Approvals are immutable"
    ON community_word_approvals FOR UPDATE
    USING (false);

DROP POLICY IF EXISTS "Approvals cannot be deleted" ON community_word_approvals;
CREATE POLICY "Approvals cannot be deleted"
    ON community_word_approvals FOR DELETE
    USING (false);

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE community_words IS 'Words approved by hosts that were not in the original dictionary';
COMMENT ON TABLE community_word_approvals IS 'Individual approval events for community words';
COMMENT ON COLUMN community_words.promoted_to_dictionary IS 'True when word has reached approval threshold and been added to dictionary file';
