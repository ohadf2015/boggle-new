-- Blast Mode Results & Personal Bests
-- Stores individual session results and tracks personal bests per difficulty.

-- Individual game results (session history)
CREATE TABLE IF NOT EXISTS blast_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    tiles_cleared INTEGER NOT NULL DEFAULT 0,
    total_tiles INTEGER NOT NULL DEFAULT 0,
    clear_percentage REAL NOT NULL DEFAULT 0,
    words_found INTEGER NOT NULL DEFAULT 0,
    best_word TEXT,
    max_combo INTEGER NOT NULL DEFAULT 0,
    stars INTEGER NOT NULL DEFAULT 1 CHECK (stars BETWEEN 1 AND 3),
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    language TEXT NOT NULL DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_blast_results_user_id ON blast_results(user_id);
CREATE INDEX IF NOT EXISTS idx_blast_results_created_at ON blast_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blast_results_user_difficulty ON blast_results(user_id, difficulty);

-- Personal bests per user + difficulty (upserted after each game)
CREATE TABLE IF NOT EXISTS blast_personal_bests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    best_score INTEGER NOT NULL DEFAULT 0,
    best_clear_percentage REAL NOT NULL DEFAULT 0,
    best_max_combo INTEGER NOT NULL DEFAULT 0,
    total_games INTEGER NOT NULL DEFAULT 0,
    total_words INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, difficulty)
);

CREATE INDEX IF NOT EXISTS idx_blast_personal_bests_user ON blast_personal_bests(user_id);

-- RLS policies
ALTER TABLE blast_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE blast_personal_bests ENABLE ROW LEVEL SECURITY;

-- Users can read their own results
CREATE POLICY "Users can read own blast results"
    ON blast_results FOR SELECT
    USING (auth.uid() = user_id);

-- Service role inserts (API routes use service role key)
CREATE POLICY "Service role can insert blast results"
    ON blast_results FOR INSERT
    WITH CHECK (true);

-- Users can read their own personal bests
CREATE POLICY "Users can read own blast personal bests"
    ON blast_personal_bests FOR SELECT
    USING (auth.uid() = user_id);

-- Service role manages personal bests
CREATE POLICY "Service role can manage blast personal bests"
    ON blast_personal_bests FOR ALL
    USING (true)
    WITH CHECK (true);
