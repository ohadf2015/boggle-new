-- =============================================
-- ENGAGEMENT SYSTEMS DATABASE SCHEMA
-- Migration: 014_engagement_systems
-- Features: Daily Challenges, Streaks, Calendar Rewards, Come-back Campaigns
-- =============================================

-- =============================================
-- PLAYER ENGAGEMENT TABLE
-- Tracks streaks, calendar progress, and engagement metrics
-- =============================================
CREATE TABLE IF NOT EXISTS player_engagement (
    player_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

    -- Daily Login Streak
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_login_date DATE,
    streak_protected_until DATE, -- Streak freeze protection
    streak_freezes_available INTEGER DEFAULT 0,

    -- Calendar Rewards
    calendar_month INTEGER, -- Current month (1-12)
    calendar_year INTEGER,
    calendar_days_claimed INTEGER[] DEFAULT '{}', -- Array of claimed day numbers

    -- Come-back Campaign
    last_played_at TIMESTAMPTZ,
    comeback_bonus_claimed BOOLEAN DEFAULT FALSE,
    comeback_bonus_expires_at TIMESTAMPTZ,
    comeback_xp_multiplier DECIMAL(3,2) DEFAULT 1.0,

    -- Session Metrics
    total_sessions INTEGER DEFAULT 0,
    avg_session_length INTEGER DEFAULT 0, -- in seconds
    games_today INTEGER DEFAULT 0,
    last_session_date DATE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DAILY CHALLENGES TABLE
-- Stores daily challenge definitions and progress
-- =============================================
CREATE TABLE IF NOT EXISTS daily_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    challenge_date DATE NOT NULL,

    -- Challenge definition
    challenge_type TEXT NOT NULL, -- 'word_count', 'long_words', 'perfect_games', 'combo', 'speed_run', 'social_play'
    challenge_tier TEXT NOT NULL, -- 'easy', 'medium', 'hard'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    target_value INTEGER NOT NULL,
    current_value INTEGER DEFAULT 0,

    -- Rewards
    xp_reward INTEGER NOT NULL,
    bonus_reward JSONB, -- Additional rewards like hints, titles, etc.

    -- Status
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(player_id, challenge_date, challenge_type)
);

-- =============================================
-- WEEKLY QUESTS TABLE
-- Longer-term quest progression
-- =============================================
CREATE TABLE IF NOT EXISTS weekly_quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    week_start DATE NOT NULL, -- Monday of the week

    -- Quest definition
    quest_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    requirements JSONB NOT NULL, -- Array of requirement objects
    current_progress JSONB DEFAULT '{}', -- Progress for each requirement

    -- Rewards
    xp_reward INTEGER NOT NULL,
    bonus_rewards JSONB, -- Titles, avatar items, etc.

    -- Status
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    claimed BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(player_id, week_start, quest_type)
);

-- =============================================
-- MYSTERY REWARDS LOG
-- Track variable ratio rewards given
-- =============================================
CREATE TABLE IF NOT EXISTS mystery_rewards_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    game_code TEXT,

    -- Reward details
    trigger_type TEXT NOT NULL, -- 'game_completion', 'long_word', 'achievement'
    reward_type TEXT NOT NULL, -- 'xp_multiplier', 'bonus_hints', 'rare_title'
    reward_value TEXT NOT NULL,

    -- Timestamps
    awarded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Player engagement indexes
CREATE INDEX IF NOT EXISTS idx_player_engagement_last_login ON player_engagement(last_login_date);
CREATE INDEX IF NOT EXISTS idx_player_engagement_streak ON player_engagement(current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_player_engagement_last_played ON player_engagement(last_played_at);

-- Daily challenges indexes
CREATE INDEX IF NOT EXISTS idx_daily_challenges_player_date ON daily_challenges(player_id, challenge_date);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_uncompleted ON daily_challenges(player_id, challenge_date) WHERE NOT completed;

-- Weekly quests indexes
CREATE INDEX IF NOT EXISTS idx_weekly_quests_player_week ON weekly_quests(player_id, week_start);

-- Mystery rewards indexes
CREATE INDEX IF NOT EXISTS idx_mystery_rewards_player ON mystery_rewards_log(player_id);
CREATE INDEX IF NOT EXISTS idx_mystery_rewards_date ON mystery_rewards_log(awarded_at DESC);

-- =============================================
-- ADD XP AND ENGAGEMENT COLUMNS TO PROFILES
-- =============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_hints_used INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS free_hints_available INTEGER DEFAULT 3;

-- =============================================
-- TRIGGER: Update engagement on login
-- =============================================
CREATE OR REPLACE FUNCTION update_player_engagement_on_login()
RETURNS TRIGGER AS $$
DECLARE
    today DATE := CURRENT_DATE;
    yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
    -- Check if this is a new day
    IF OLD.last_login_date IS NULL OR OLD.last_login_date < today THEN
        -- Update streak
        IF OLD.last_login_date = yesterday OR OLD.streak_protected_until >= today THEN
            -- Continue streak
            NEW.current_streak := OLD.current_streak + 1;
        ELSIF OLD.last_login_date < yesterday AND OLD.streak_freezes_available > 0 THEN
            -- Use streak freeze
            NEW.current_streak := OLD.current_streak + 1;
            NEW.streak_freezes_available := OLD.streak_freezes_available - 1;
        ELSE
            -- Reset streak
            NEW.current_streak := 1;
        END IF;

        -- Update longest streak
        IF NEW.current_streak > COALESCE(OLD.longest_streak, 0) THEN
            NEW.longest_streak := NEW.current_streak;
        END IF;

        NEW.last_login_date := today;
        NEW.games_today := 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS player_engagement_login_trigger ON player_engagement;
CREATE TRIGGER player_engagement_login_trigger
    BEFORE UPDATE ON player_engagement
    FOR EACH ROW
    EXECUTE FUNCTION update_player_engagement_on_login();

-- =============================================
-- FUNCTION: Get streak bonus multiplier
-- =============================================
CREATE OR REPLACE FUNCTION get_streak_bonus_multiplier(streak INTEGER)
RETURNS DECIMAL(3,2) AS $$
BEGIN
    CASE
        WHEN streak >= 30 THEN RETURN 2.0;
        WHEN streak >= 14 THEN RETURN 1.75;
        WHEN streak >= 7 THEN RETURN 1.5;
        WHEN streak >= 3 THEN RETURN 1.25;
        ELSE RETURN 1.0;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: Calculate comeback bonus
-- =============================================
CREATE OR REPLACE FUNCTION calculate_comeback_bonus(days_away INTEGER)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    CASE
        WHEN days_away >= 30 THEN
            result := jsonb_build_object(
                'xp_multiplier', 3.0,
                'duration_hours', 72,
                'free_hints', 5,
                'streak_freezes', 3,
                'exclusive_title', 'THE_RETURNED'
            );
        WHEN days_away >= 7 THEN
            result := jsonb_build_object(
                'xp_multiplier', 2.0,
                'duration_hours', 48,
                'free_hints', 3,
                'streak_freezes', 1,
                'exclusive_title', NULL
            );
        WHEN days_away >= 3 THEN
            result := jsonb_build_object(
                'xp_multiplier', 1.5,
                'duration_hours', 24,
                'free_hints', 1,
                'streak_freezes', 0,
                'exclusive_title', NULL
            );
        ELSE
            result := jsonb_build_object(
                'xp_multiplier', 1.0,
                'duration_hours', 0,
                'free_hints', 0,
                'streak_freezes', 0,
                'exclusive_title', NULL
            );
    END CASE;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- UPDATED_AT TRIGGERS
-- =============================================
DROP TRIGGER IF EXISTS player_engagement_updated_at ON player_engagement;
CREATE TRIGGER player_engagement_updated_at
    BEFORE UPDATE ON player_engagement
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE player_engagement IS 'Tracks player engagement metrics, streaks, and calendar rewards';
COMMENT ON TABLE daily_challenges IS 'Daily challenge definitions and progress per player';
COMMENT ON TABLE weekly_quests IS 'Weekly quest progression tracking';
COMMENT ON TABLE mystery_rewards_log IS 'Log of variable ratio mystery rewards awarded';
