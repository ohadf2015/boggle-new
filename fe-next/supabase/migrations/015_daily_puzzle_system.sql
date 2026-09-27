-- =============================================
-- DAILY PUZZLE SYSTEM DATABASE SCHEMA
-- Migration: 015_daily_puzzle_system
-- Features: Wordle-style Daily Puzzles with Shareable Results
-- =============================================

-- =============================================
-- DAILY PUZZLES TABLE
-- Stores metadata about each daily puzzle
-- Same puzzle for everyone worldwide each day
-- =============================================
CREATE TABLE IF NOT EXISTS daily_puzzles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    puzzle_number INTEGER UNIQUE NOT NULL, -- Sequential: 1, 2, 3...
    puzzle_date DATE UNIQUE NOT NULL, -- UTC date
    language TEXT NOT NULL DEFAULT 'en',

    -- Grid seed for verification/replay
    grid_seed TEXT NOT NULL,

    -- Aggregate stats (updated periodically)
    total_attempts INTEGER DEFAULT 0,
    total_completions INTEGER DEFAULT 0,
    average_score DECIMAL(8,2) DEFAULT 0,
    average_words DECIMAL(6,2) DEFAULT 0,
    top_score INTEGER DEFAULT 0,
    top_word_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DAILY PUZZLE ATTEMPTS TABLE
-- One row per user per day per language
-- Supports both registered users and guests
-- =============================================
CREATE TABLE IF NOT EXISTS daily_puzzle_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- User identification (one of these must be set)
    player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    guest_fingerprint TEXT, -- For guest tracking (browser fingerprint)

    -- Puzzle reference
    puzzle_date DATE NOT NULL,
    puzzle_number INTEGER NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',

    -- Game results
    score INTEGER NOT NULL,
    word_count INTEGER NOT NULL,
    words_by_length JSONB DEFAULT '{}', -- {"3": 2, "4": 5, ...}
    time_seconds INTEGER, -- Time to complete
    longest_word TEXT,
    longest_word_length INTEGER,

    -- Sharing
    shared BOOLEAN DEFAULT FALSE,
    share_method TEXT, -- 'whatsapp', 'twitter', 'telegram', 'copy'
    shared_at TIMESTAMPTZ,

    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one attempt per user per day per language
    CONSTRAINT unique_player_daily UNIQUE (player_id, puzzle_date, language),
    CONSTRAINT unique_guest_daily UNIQUE (guest_fingerprint, puzzle_date, language),
    CONSTRAINT require_user_or_guest CHECK (
        (player_id IS NOT NULL) OR (guest_fingerprint IS NOT NULL)
    )
);

-- =============================================
-- DAILY PUZZLE STREAKS TABLE
-- Separate from login/win streaks
-- Tracks completion of daily puzzles
-- =============================================
CREATE TABLE IF NOT EXISTS daily_puzzle_streaks (
    player_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

    -- Streak tracking
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_played_date DATE,

    -- Stats
    total_dailies_completed INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    average_score DECIMAL(8,2) DEFAULT 0,
    best_score INTEGER DEFAULT 0,
    best_score_puzzle_number INTEGER,
    best_word_count INTEGER DEFAULT 0,

    -- Milestones reached
    milestones_reached INTEGER[] DEFAULT '{}', -- [7, 14, 30, 50, 100, 365]

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- GUEST DAILY PUZZLE STREAKS TABLE
-- For guests who haven't signed up yet
-- =============================================
CREATE TABLE IF NOT EXISTS guest_daily_puzzle_streaks (
    guest_fingerprint TEXT PRIMARY KEY,

    -- Streak tracking
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_played_date DATE,
    total_dailies_completed INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DAILY PUZZLE LEADERBOARD VIEW
-- Top scores for each day
-- =============================================
CREATE OR REPLACE VIEW daily_puzzle_leaderboard AS
SELECT
    dpa.puzzle_date,
    dpa.puzzle_number,
    dpa.language,
    dpa.player_id,
    p.display_name,
    p.username,
    p.avatar_emoji,
    p.avatar_color,
    dpa.score,
    dpa.word_count,
    dpa.time_seconds,
    dpa.longest_word,
    ROW_NUMBER() OVER (
        PARTITION BY dpa.puzzle_date, dpa.language
        ORDER BY dpa.score DESC, dpa.word_count DESC, dpa.time_seconds ASC
    ) as rank_position
FROM daily_puzzle_attempts dpa
LEFT JOIN profiles p ON dpa.player_id = p.id
WHERE dpa.player_id IS NOT NULL -- Only registered users on leaderboard
ORDER BY dpa.puzzle_date DESC, rank_position ASC;

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Daily puzzles indexes
CREATE INDEX IF NOT EXISTS idx_daily_puzzles_date ON daily_puzzles(puzzle_date);
CREATE INDEX IF NOT EXISTS idx_daily_puzzles_number ON daily_puzzles(puzzle_number);
CREATE INDEX IF NOT EXISTS idx_daily_puzzles_language ON daily_puzzles(language);

-- Daily puzzle attempts indexes
CREATE INDEX IF NOT EXISTS idx_daily_attempts_date ON daily_puzzle_attempts(puzzle_date);
CREATE INDEX IF NOT EXISTS idx_daily_attempts_player ON daily_puzzle_attempts(player_id);
CREATE INDEX IF NOT EXISTS idx_daily_attempts_guest ON daily_puzzle_attempts(guest_fingerprint);
CREATE INDEX IF NOT EXISTS idx_daily_attempts_player_date ON daily_puzzle_attempts(player_id, puzzle_date);
CREATE INDEX IF NOT EXISTS idx_daily_attempts_score ON daily_puzzle_attempts(puzzle_date, score DESC);
CREATE INDEX IF NOT EXISTS idx_daily_attempts_language ON daily_puzzle_attempts(language);

-- Daily puzzle streaks indexes
CREATE INDEX IF NOT EXISTS idx_daily_streaks_streak ON daily_puzzle_streaks(current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_daily_streaks_last_played ON daily_puzzle_streaks(last_played_date);

-- Guest daily puzzle streaks indexes
CREATE INDEX IF NOT EXISTS idx_guest_daily_streaks_fingerprint ON guest_daily_puzzle_streaks(guest_fingerprint);

-- =============================================
-- FUNCTION: Update puzzle stats after completion
-- =============================================
CREATE OR REPLACE FUNCTION update_daily_puzzle_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert the puzzle stats
    INSERT INTO daily_puzzles (
        puzzle_number,
        puzzle_date,
        language,
        grid_seed,
        total_attempts,
        total_completions,
        average_score,
        average_words,
        top_score,
        top_word_count
    )
    VALUES (
        NEW.puzzle_number,
        NEW.puzzle_date,
        NEW.language,
        CONCAT('seed-', NEW.puzzle_date, '-', NEW.language),
        1,
        1,
        NEW.score,
        NEW.word_count,
        NEW.score,
        NEW.word_count
    )
    ON CONFLICT (puzzle_date) DO UPDATE SET
        total_attempts = daily_puzzles.total_attempts + 1,
        total_completions = daily_puzzles.total_completions + 1,
        average_score = (
            (daily_puzzles.average_score * daily_puzzles.total_completions + NEW.score) /
            (daily_puzzles.total_completions + 1)
        ),
        average_words = (
            (daily_puzzles.average_words * daily_puzzles.total_completions + NEW.word_count) /
            (daily_puzzles.total_completions + 1)
        ),
        top_score = GREATEST(daily_puzzles.top_score, NEW.score),
        top_word_count = GREATEST(daily_puzzles.top_word_count, NEW.word_count),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS daily_puzzle_attempt_stats_trigger ON daily_puzzle_attempts;
CREATE TRIGGER daily_puzzle_attempt_stats_trigger
    AFTER INSERT ON daily_puzzle_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_puzzle_stats();

-- =============================================
-- FUNCTION: Update player daily puzzle streak
-- =============================================
CREATE OR REPLACE FUNCTION update_daily_puzzle_streak()
RETURNS TRIGGER AS $$
DECLARE
    today DATE := NEW.puzzle_date;
    yesterday DATE := NEW.puzzle_date - INTERVAL '1 day';
    current_streak_val INTEGER;
    longest_streak_val INTEGER;
    total_completed INTEGER;
    total_score_val INTEGER;
    best_score_val INTEGER;
    best_score_puzzle INTEGER;
    best_word_count_val INTEGER;
BEGIN
    -- Only update for registered users
    IF NEW.player_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get existing streak data
    SELECT
        current_streak, longest_streak, total_dailies_completed,
        total_score, best_score, best_score_puzzle_number, best_word_count
    INTO
        current_streak_val, longest_streak_val, total_completed,
        total_score_val, best_score_val, best_score_puzzle, best_word_count_val
    FROM daily_puzzle_streaks
    WHERE player_id = NEW.player_id;

    -- Initialize if not exists
    IF NOT FOUND THEN
        current_streak_val := 0;
        longest_streak_val := 0;
        total_completed := 0;
        total_score_val := 0;
        best_score_val := 0;
        best_score_puzzle := NULL;
        best_word_count_val := 0;
    END IF;

    -- Check if played yesterday
    IF EXISTS (
        SELECT 1 FROM daily_puzzle_attempts
        WHERE player_id = NEW.player_id
        AND puzzle_date = yesterday
        AND language = NEW.language
    ) THEN
        -- Continue streak
        current_streak_val := current_streak_val + 1;
    ELSE
        -- Check if this is a new streak (not played yesterday)
        IF NOT EXISTS (
            SELECT 1 FROM daily_puzzle_attempts
            WHERE player_id = NEW.player_id
            AND puzzle_date = today
            AND language = NEW.language
            AND id != NEW.id
        ) THEN
            -- Start new streak
            current_streak_val := 1;
        END IF;
    END IF;

    -- Update longest streak
    IF current_streak_val > longest_streak_val THEN
        longest_streak_val := current_streak_val;
    END IF;

    -- Update best score
    IF NEW.score > best_score_val THEN
        best_score_val := NEW.score;
        best_score_puzzle := NEW.puzzle_number;
    END IF;

    -- Update best word count
    IF NEW.word_count > best_word_count_val THEN
        best_word_count_val := NEW.word_count;
    END IF;

    -- Upsert streak record
    INSERT INTO daily_puzzle_streaks (
        player_id,
        current_streak,
        longest_streak,
        last_played_date,
        total_dailies_completed,
        total_score,
        average_score,
        best_score,
        best_score_puzzle_number,
        best_word_count
    )
    VALUES (
        NEW.player_id,
        current_streak_val,
        longest_streak_val,
        today,
        total_completed + 1,
        total_score_val + NEW.score,
        (total_score_val + NEW.score)::DECIMAL / (total_completed + 1),
        best_score_val,
        best_score_puzzle,
        best_word_count_val
    )
    ON CONFLICT (player_id) DO UPDATE SET
        current_streak = EXCLUDED.current_streak,
        longest_streak = EXCLUDED.longest_streak,
        last_played_date = EXCLUDED.last_played_date,
        total_dailies_completed = EXCLUDED.total_dailies_completed,
        total_score = EXCLUDED.total_score,
        average_score = EXCLUDED.average_score,
        best_score = EXCLUDED.best_score,
        best_score_puzzle_number = EXCLUDED.best_score_puzzle_number,
        best_word_count = EXCLUDED.best_word_count,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS daily_puzzle_streak_trigger ON daily_puzzle_attempts;
CREATE TRIGGER daily_puzzle_streak_trigger
    AFTER INSERT ON daily_puzzle_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_puzzle_streak();

-- =============================================
-- FUNCTION: Migrate guest stats to registered user
-- =============================================
CREATE OR REPLACE FUNCTION migrate_guest_daily_stats(
    p_guest_fingerprint TEXT,
    p_player_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Update all guest attempts to be owned by the player
    UPDATE daily_puzzle_attempts
    SET player_id = p_player_id,
        guest_fingerprint = NULL
    WHERE guest_fingerprint = p_guest_fingerprint
    AND player_id IS NULL;

    -- Merge guest streak into player streak
    INSERT INTO daily_puzzle_streaks (player_id, current_streak, longest_streak, last_played_date, total_dailies_completed)
    SELECT
        p_player_id,
        current_streak,
        longest_streak,
        last_played_date,
        total_dailies_completed
    FROM guest_daily_puzzle_streaks
    WHERE guest_fingerprint = p_guest_fingerprint
    ON CONFLICT (player_id) DO UPDATE SET
        current_streak = GREATEST(daily_puzzle_streaks.current_streak, EXCLUDED.current_streak),
        longest_streak = GREATEST(daily_puzzle_streaks.longest_streak, EXCLUDED.longest_streak),
        last_played_date = GREATEST(daily_puzzle_streaks.last_played_date, EXCLUDED.last_played_date),
        total_dailies_completed = daily_puzzle_streaks.total_dailies_completed + EXCLUDED.total_dailies_completed;

    -- Delete guest streak record
    DELETE FROM guest_daily_puzzle_streaks WHERE guest_fingerprint = p_guest_fingerprint;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on tables
ALTER TABLE daily_puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_puzzle_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_puzzle_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_daily_puzzle_streaks ENABLE ROW LEVEL SECURITY;

-- Daily puzzles are readable by everyone
CREATE POLICY "Daily puzzles are readable by everyone"
    ON daily_puzzles FOR SELECT
    USING (true);

-- Daily puzzle attempts policies
CREATE POLICY "Users can view their own attempts"
    ON daily_puzzle_attempts FOR SELECT
    USING (
        player_id = auth.uid() OR
        guest_fingerprint IS NOT NULL -- Guests can see their attempts
    );

CREATE POLICY "Users can insert their own attempts"
    ON daily_puzzle_attempts FOR INSERT
    WITH CHECK (
        player_id = auth.uid() OR
        (player_id IS NULL AND guest_fingerprint IS NOT NULL)
    );

CREATE POLICY "Users can update their own attempts"
    ON daily_puzzle_attempts FOR UPDATE
    USING (player_id = auth.uid());

-- Daily puzzle streaks policies
CREATE POLICY "Users can view their own streaks"
    ON daily_puzzle_streaks FOR SELECT
    USING (player_id = auth.uid());

CREATE POLICY "Users can view all streaks for leaderboard"
    ON daily_puzzle_streaks FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own streaks"
    ON daily_puzzle_streaks FOR UPDATE
    USING (player_id = auth.uid());

-- Guest streaks are public (tracked by fingerprint)
CREATE POLICY "Guest streaks are accessible"
    ON guest_daily_puzzle_streaks FOR ALL
    USING (true);

-- =============================================
-- UPDATED_AT TRIGGERS
-- =============================================
DROP TRIGGER IF EXISTS daily_puzzles_updated_at ON daily_puzzles;
CREATE TRIGGER daily_puzzles_updated_at
    BEFORE UPDATE ON daily_puzzles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS daily_puzzle_streaks_updated_at ON daily_puzzle_streaks;
CREATE TRIGGER daily_puzzle_streaks_updated_at
    BEFORE UPDATE ON daily_puzzle_streaks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS guest_daily_puzzle_streaks_updated_at ON guest_daily_puzzle_streaks;
CREATE TRIGGER guest_daily_puzzle_streaks_updated_at
    BEFORE UPDATE ON guest_daily_puzzle_streaks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE daily_puzzles IS 'Metadata and aggregate stats for each daily puzzle';
COMMENT ON TABLE daily_puzzle_attempts IS 'Individual user attempts at daily puzzles (one per user per day per language)';
COMMENT ON TABLE daily_puzzle_streaks IS 'Player streak tracking for daily puzzle completion';
COMMENT ON TABLE guest_daily_puzzle_streaks IS 'Guest streak tracking (migrated on signup)';
COMMENT ON VIEW daily_puzzle_leaderboard IS 'Daily puzzle leaderboard with player rankings';
