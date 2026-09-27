-- =============================================
-- WORD VOTING TABLES
-- Migration: 005_word_voting
-- Crowd-sourced word validation system
-- Players vote on non-dictionary words, words with net score >= 6 become valid
-- =============================================

-- =============================================
-- WORD_VOTES TABLE
-- Track individual player votes (supports both auth users and guests)
-- =============================================
CREATE TABLE IF NOT EXISTS word_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word TEXT NOT NULL,
    language TEXT NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,  -- NULL for guests
    guest_id TEXT,  -- For guest users (from guestManager session)
    game_code TEXT NOT NULL,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure either user_id or guest_id is set
    CONSTRAINT must_have_voter CHECK (user_id IS NOT NULL OR guest_id IS NOT NULL),
    -- One vote per authenticated user per word per language
    CONSTRAINT unique_auth_user_vote UNIQUE (user_id, word, language),
    -- One vote per guest per word per language
    CONSTRAINT unique_guest_vote UNIQUE (guest_id, word, language)
);

-- =============================================
-- WORD_SCORES TABLE
-- Aggregated scores for words (denormalized for fast reads)
-- =============================================
CREATE TABLE IF NOT EXISTS word_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word TEXT NOT NULL,
    language TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    dislikes_count INTEGER DEFAULT 0,
    net_score INTEGER GENERATED ALWAYS AS (likes_count - dislikes_count) STORED,
    is_potentially_valid BOOLEAN GENERATED ALWAYS AS (likes_count - dislikes_count >= 6) STORED,
    first_submitter TEXT,  -- Username who first submitted this word
    first_voted_at TIMESTAMPTZ DEFAULT NOW(),
    last_voted_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_word_language_score UNIQUE (word, language)
);

-- =============================================
-- INDEXES
-- =============================================
-- For looking up votes by word
CREATE INDEX IF NOT EXISTS idx_word_votes_word_lang ON word_votes(word, language);
-- For looking up user's votes
CREATE INDEX IF NOT EXISTS idx_word_votes_user ON word_votes(user_id) WHERE user_id IS NOT NULL;
-- For looking up guest's votes
CREATE INDEX IF NOT EXISTS idx_word_votes_guest ON word_votes(guest_id) WHERE guest_id IS NOT NULL;
-- For looking up votes by game
CREATE INDEX IF NOT EXISTS idx_word_votes_game ON word_votes(game_code);

-- For fast lookup of potentially valid words (net_score >= 6)
CREATE INDEX IF NOT EXISTS idx_word_scores_valid ON word_scores(language) WHERE is_potentially_valid = TRUE;
-- For sorting by net score
CREATE INDEX IF NOT EXISTS idx_word_scores_net ON word_scores(language, net_score DESC);

-- =============================================
-- TRIGGER: Update word_scores on vote insert
-- =============================================
CREATE OR REPLACE FUNCTION update_word_score_on_vote()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO word_scores (word, language, likes_count, dislikes_count, last_voted_at)
    VALUES (
        NEW.word,
        NEW.language,
        CASE WHEN NEW.vote_type = 'like' THEN 1 ELSE 0 END,
        CASE WHEN NEW.vote_type = 'dislike' THEN 1 ELSE 0 END,
        NOW()
    )
    ON CONFLICT (word, language) DO UPDATE SET
        likes_count = word_scores.likes_count + CASE WHEN NEW.vote_type = 'like' THEN 1 ELSE 0 END,
        dislikes_count = word_scores.dislikes_count + CASE WHEN NEW.vote_type = 'dislike' THEN 1 ELSE 0 END,
        last_voted_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS word_vote_aggregate_trigger ON word_votes;
CREATE TRIGGER word_vote_aggregate_trigger
AFTER INSERT ON word_votes
FOR EACH ROW EXECUTE FUNCTION update_word_score_on_vote();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on both tables
ALTER TABLE word_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_scores ENABLE ROW LEVEL SECURITY;

-- Word votes are viewable by everyone (transparency)
DROP POLICY IF EXISTS "Word votes are viewable by everyone" ON word_votes;
CREATE POLICY "Word votes are viewable by everyone"
    ON word_votes FOR SELECT
    USING (true);

-- Server can insert word votes (via service role from backend)
DROP POLICY IF EXISTS "Server can insert word votes" ON word_votes;
CREATE POLICY "Server can insert word votes"
    ON word_votes FOR INSERT
    WITH CHECK (true);

-- Word votes are immutable (cannot change vote)
DROP POLICY IF EXISTS "Word votes are immutable" ON word_votes;
CREATE POLICY "Word votes are immutable"
    ON word_votes FOR UPDATE
    USING (false);

-- Word votes cannot be deleted
DROP POLICY IF EXISTS "Word votes cannot be deleted" ON word_votes;
CREATE POLICY "Word votes cannot be deleted"
    ON word_votes FOR DELETE
    USING (false);

-- Word scores are viewable by everyone
DROP POLICY IF EXISTS "Word scores are viewable by everyone" ON word_scores;
CREATE POLICY "Word scores are viewable by everyone"
    ON word_scores FOR SELECT
    USING (true);

-- Server can insert/update word scores (managed by trigger)
DROP POLICY IF EXISTS "Server can manage word scores" ON word_scores;
CREATE POLICY "Server can manage word scores"
    ON word_scores FOR ALL
    USING (true)
    WITH CHECK (true);

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE word_votes IS 'Individual player votes (like/dislike) on non-dictionary words';
COMMENT ON TABLE word_scores IS 'Aggregated vote scores per word, words with net_score >= 6 become potentially valid';
COMMENT ON COLUMN word_votes.guest_id IS 'Guest identifier from guestManager session for non-authenticated users';
COMMENT ON COLUMN word_scores.is_potentially_valid IS 'TRUE when net_score (likes - dislikes) >= 6, auto-validates word during gameplay';
