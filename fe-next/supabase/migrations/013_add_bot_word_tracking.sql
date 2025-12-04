-- BOT WORD TRACKING
-- Migration: 013_add_bot_word_tracking
-- Track which votes are for bot-submitted words
-- Allows admins to review and blacklist problematic bot words

-- Add is_bot_word column to word_votes table
ALTER TABLE word_votes ADD COLUMN IF NOT EXISTS is_bot_word BOOLEAN DEFAULT FALSE;

-- Create index for querying bot word votes
CREATE INDEX IF NOT EXISTS idx_word_votes_bot ON word_votes(is_bot_word) WHERE is_bot_word = TRUE;

-- Create a view for admin to see bot words with negative votes
DROP VIEW IF EXISTS bot_words_for_review;
CREATE VIEW bot_words_for_review AS
SELECT
    wv.word,
    wv.language,
    COUNT(*) FILTER (WHERE wv.vote_type = 'dislike') as dislike_count,
    COUNT(*) FILTER (WHERE wv.vote_type = 'like') as like_count,
    COUNT(*) as total_votes,
    ARRAY_AGG(DISTINCT wv.game_code) as game_codes,
    MIN(wv.created_at) as first_reported,
    MAX(wv.created_at) as last_reported
FROM word_votes wv
WHERE wv.is_bot_word = TRUE
GROUP BY wv.word, wv.language
HAVING COUNT(*) FILTER (WHERE wv.vote_type = 'dislike') > 0
ORDER BY COUNT(*) FILTER (WHERE wv.vote_type = 'dislike') DESC;

COMMENT ON VIEW bot_words_for_review IS 'Bot-submitted words with negative votes for admin review';

-- BOT WORD BLACKLIST TABLE
-- Words that bots should not use (marked as invalid by admin)
CREATE TABLE IF NOT EXISTS bot_word_blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word TEXT NOT NULL,
    language TEXT NOT NULL,
    blacklisted_by UUID REFERENCES profiles(id),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_blacklist_word_lang UNIQUE (word, language)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_bot_blacklist_word_lang ON bot_word_blacklist(word, language);

-- Enable RLS
ALTER TABLE bot_word_blacklist ENABLE ROW LEVEL SECURITY;

-- Only admins can manage blacklist
DROP POLICY IF EXISTS "Admins can manage bot blacklist" ON bot_word_blacklist;
CREATE POLICY "Admins can manage bot blacklist"
    ON bot_word_blacklist FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = TRUE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = TRUE
        )
    );

-- Blacklist is viewable by everyone (for bot word filtering)
DROP POLICY IF EXISTS "Bot blacklist is viewable by everyone" ON bot_word_blacklist;
CREATE POLICY "Bot blacklist is viewable by everyone"
    ON bot_word_blacklist FOR SELECT
    USING (true);

COMMENT ON TABLE bot_word_blacklist IS 'Words that bots should not use, managed by admins';
