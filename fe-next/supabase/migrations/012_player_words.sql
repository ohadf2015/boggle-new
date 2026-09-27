-- =============================================
-- PLAYER WORDS TABLE
-- Migration: 012_player_words
-- Stores valid words that players submit during games
-- Used to improve bot word selection (prioritize real player words)
-- =============================================

-- =============================================
-- PLAYER_WORDS TABLE
-- Track words that players submitted and were validated
-- =============================================
CREATE TABLE IF NOT EXISTS player_words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',

    -- Usage tracking
    times_submitted INTEGER DEFAULT 1,
    times_found_by_bots INTEGER DEFAULT 0,

    -- First submission info
    first_submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    first_submitted_in_game TEXT,
    first_submitted_at TIMESTAMPTZ DEFAULT NOW(),

    -- Last submission info
    last_submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    last_submitted_in_game TEXT,
    last_submitted_at TIMESTAMPTZ DEFAULT NOW(),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint on word + language
    CONSTRAINT unique_player_word_language UNIQUE (word, language)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_player_words_word ON player_words(word);
CREATE INDEX IF NOT EXISTS idx_player_words_language ON player_words(language);
CREATE INDEX IF NOT EXISTS idx_player_words_word_language ON player_words(word, language);
CREATE INDEX IF NOT EXISTS idx_player_words_times_submitted ON player_words(times_submitted DESC);
CREATE INDEX IF NOT EXISTS idx_player_words_language_popularity ON player_words(language, times_submitted DESC);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
DROP TRIGGER IF EXISTS player_words_updated_at ON player_words;
CREATE TRIGGER player_words_updated_at
    BEFORE UPDATE ON player_words
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS
ALTER TABLE player_words ENABLE ROW LEVEL SECURITY;

-- Player words are viewable by everyone (for bot selection)
DROP POLICY IF EXISTS "Player words are viewable by everyone" ON player_words;
CREATE POLICY "Player words are viewable by everyone"
    ON player_words FOR SELECT
    USING (true);

-- Server can insert player words (via service role from backend)
DROP POLICY IF EXISTS "Server can insert player words" ON player_words;
CREATE POLICY "Server can insert player words"
    ON player_words FOR INSERT
    WITH CHECK (true);

-- Server can update player words (for submission count)
DROP POLICY IF EXISTS "Server can update player words" ON player_words;
CREATE POLICY "Server can update player words"
    ON player_words FOR UPDATE
    USING (true);

-- Player words cannot be deleted (preserve data)
DROP POLICY IF EXISTS "Player words cannot be deleted" ON player_words;
CREATE POLICY "Player words cannot be deleted"
    ON player_words FOR DELETE
    USING (false);

-- =============================================
-- RPC FUNCTION FOR BOT WORD USAGE
-- =============================================
CREATE OR REPLACE FUNCTION increment_bot_word_usage(p_word TEXT, p_language TEXT)
RETURNS void AS $$
BEGIN
    UPDATE player_words
    SET times_found_by_bots = times_found_by_bots + 1,
        updated_at = NOW()
    WHERE word = p_word AND language = p_language;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE player_words IS 'Valid words submitted by players during games, used to improve bot word selection';
COMMENT ON COLUMN player_words.times_submitted IS 'Number of times this word has been submitted by players';
COMMENT ON COLUMN player_words.times_found_by_bots IS 'Number of times bots have selected this word';
