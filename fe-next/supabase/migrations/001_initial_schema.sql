-- =============================================
-- BOGGLE GAME DATABASE SCHEMA
-- Migration: 001_initial_schema
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search optimization

-- =============================================
-- PROFILES TABLE
-- Stores user profile data linked to Supabase Auth
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_emoji TEXT DEFAULT '😀',
    avatar_color TEXT DEFAULT '#6366f1',
    profile_picture_url TEXT,
    profile_picture_provider TEXT, -- 'google', 'discord', 'custom'

    -- Game statistics
    total_games INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    total_words INTEGER DEFAULT 0,
    longest_word TEXT,
    longest_word_length INTEGER DEFAULT 0,
    total_time_played INTEGER DEFAULT 0, -- in seconds

    -- Game type breakdown
    casual_games INTEGER DEFAULT 0,
    ranked_games INTEGER DEFAULT 0,
    ranked_wins INTEGER DEFAULT 0,

    -- Ranked MMR
    ranked_mmr INTEGER DEFAULT 1000,
    peak_mmr INTEGER DEFAULT 1000,

    -- Achievements (JSONB for flexibility)
    achievement_counts JSONB DEFAULT '{}',

    -- Timestamps
    last_game_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- LEADERBOARD TABLE
-- Denormalized for fast leaderboard queries
-- =============================================
CREATE TABLE IF NOT EXISTS leaderboard (
    player_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    avatar_emoji TEXT,
    avatar_color TEXT,
    total_score INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    ranked_mmr INTEGER DEFAULT 1000,
    rank_position INTEGER, -- Calculated by trigger
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- GAME RESULTS TABLE
-- Historical record of individual game performances
-- =============================================
CREATE TABLE IF NOT EXISTS game_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    game_code TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    word_count INTEGER DEFAULT 0,
    longest_word TEXT,
    placement INTEGER,
    is_ranked BOOLEAN DEFAULT FALSE,
    language TEXT DEFAULT 'en',
    time_played INTEGER DEFAULT 0, -- in seconds
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- GUEST TOKENS TABLE
-- Track guest player stats before account creation
-- =============================================
CREATE TABLE IF NOT EXISTS guest_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash TEXT UNIQUE NOT NULL,
    stats JSONB DEFAULT '{"games": 0, "score": 0, "words": 0, "timePlayed": 0, "achievementCounts": {}}',
    claimed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RANKED PROGRESS TABLE
-- Track progress toward ranked mode unlock
-- =============================================
CREATE TABLE IF NOT EXISTS ranked_progress (
    player_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    casual_games_played INTEGER DEFAULT 0,
    unlocked_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON profiles USING gin(username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_total_score ON profiles(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_ranked_mmr ON profiles(ranked_mmr DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_last_game_at ON profiles(last_game_at DESC);

-- Leaderboard indexes
CREATE INDEX IF NOT EXISTS idx_leaderboard_total_score ON leaderboard(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_ranked_mmr ON leaderboard(ranked_mmr DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank_position ON leaderboard(rank_position ASC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_username ON leaderboard(username);

-- Game results indexes
CREATE INDEX IF NOT EXISTS idx_game_results_player_id ON game_results(player_id);
CREATE INDEX IF NOT EXISTS idx_game_results_game_code ON game_results(game_code);
CREATE INDEX IF NOT EXISTS idx_game_results_created_at ON game_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_results_is_ranked ON game_results(is_ranked);
CREATE INDEX IF NOT EXISTS idx_game_results_player_ranked ON game_results(player_id, is_ranked);

-- Guest tokens indexes
CREATE INDEX IF NOT EXISTS idx_guest_tokens_hash ON guest_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_guest_tokens_unclaimed ON guest_tokens(token_hash) WHERE claimed_by IS NULL;

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================
-- Drop existing function if return type changed
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS guest_tokens_updated_at ON guest_tokens;
CREATE TRIGGER guest_tokens_updated_at
    BEFORE UPDATE ON guest_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS ranked_progress_updated_at ON ranked_progress;
CREATE TRIGGER ranked_progress_updated_at
    BEFORE UPDATE ON ranked_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- LEADERBOARD RANK CALCULATION TRIGGER
-- =============================================
-- Drop existing function if return type changed
DROP FUNCTION IF EXISTS update_leaderboard_ranks() CASCADE;

CREATE FUNCTION update_leaderboard_ranks()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all rank positions based on total_score
    WITH ranked AS (
        SELECT
            player_id,
            ROW_NUMBER() OVER (ORDER BY total_score DESC, games_played DESC) as new_rank
        FROM leaderboard
    )
    UPDATE leaderboard l
    SET rank_position = r.new_rank
    FROM ranked r
    WHERE l.player_id = r.player_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leaderboard_rank_trigger ON leaderboard;
CREATE TRIGGER leaderboard_rank_trigger
    AFTER INSERT OR UPDATE OF total_score ON leaderboard
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_leaderboard_ranks();

-- =============================================
-- PROFILE SYNC TO LEADERBOARD FUNCTION
-- Automatically sync profile stats to leaderboard
-- =============================================
-- Drop existing function if return type changed
DROP FUNCTION IF EXISTS sync_profile_to_leaderboard() CASCADE;

CREATE FUNCTION sync_profile_to_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO leaderboard (
        player_id,
        username,
        avatar_emoji,
        avatar_color,
        total_score,
        games_played,
        games_won,
        ranked_mmr,
        last_updated
    ) VALUES (
        NEW.id,
        NEW.username,
        NEW.avatar_emoji,
        NEW.avatar_color,
        COALESCE(NEW.total_score, 0),
        COALESCE(NEW.total_games, 0),
        COALESCE(NEW.ranked_wins, 0),
        COALESCE(NEW.ranked_mmr, 1000),
        NOW()
    )
    ON CONFLICT (player_id) DO UPDATE SET
        username = EXCLUDED.username,
        avatar_emoji = EXCLUDED.avatar_emoji,
        avatar_color = EXCLUDED.avatar_color,
        total_score = EXCLUDED.total_score,
        games_played = EXCLUDED.games_played,
        games_won = EXCLUDED.games_won,
        ranked_mmr = EXCLUDED.ranked_mmr,
        last_updated = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profile_to_leaderboard_sync ON profiles;
CREATE TRIGGER profile_to_leaderboard_sync
    AFTER INSERT OR UPDATE OF username, avatar_emoji, avatar_color, total_score, total_games, ranked_wins, ranked_mmr
    ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_to_leaderboard();

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================
COMMENT ON TABLE profiles IS 'User profiles linked to Supabase Auth';
COMMENT ON TABLE leaderboard IS 'Denormalized leaderboard for fast queries - auto-synced from profiles';
COMMENT ON TABLE game_results IS 'Historical game results for analytics';
COMMENT ON TABLE guest_tokens IS 'Guest player tracking before registration';
COMMENT ON TABLE ranked_progress IS 'Track progress toward ranked mode unlock (10 casual games required)';
