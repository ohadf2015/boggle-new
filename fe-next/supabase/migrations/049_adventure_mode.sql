-- =============================================
-- ADVENTURE MODE TABLES
-- Migration: 049_adventure_mode
-- Description: Creates tables for adventure mode progression system
-- =============================================

-- =============================================
-- PLAYER PROGRESSION TABLE
-- Stores player's adventure progress, XP, and current position
-- =============================================
CREATE TABLE IF NOT EXISTS player_progression (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    player_level INT DEFAULT 1 CHECK (player_level >= 1 AND player_level <= 50),
    xp INT DEFAULT 0 CHECK (xp >= 0),
    current_world INT DEFAULT 1 CHECK (current_world >= 1 AND current_world <= 10),
    current_level INT DEFAULT 1 CHECK (current_level >= 1 AND current_level <= 10),
    total_stars INT DEFAULT 0 CHECK (total_stars >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE player_progression IS 'Tracks player adventure mode progression including XP, level, and current position';
COMMENT ON COLUMN player_progression.user_id IS 'Foreign key to auth.users';
COMMENT ON COLUMN player_progression.player_level IS 'Player level from 1-50 based on XP';
COMMENT ON COLUMN player_progression.xp IS 'Total experience points earned';
COMMENT ON COLUMN player_progression.current_world IS 'Current world (1-10) the player is on';
COMMENT ON COLUMN player_progression.current_level IS 'Current level (1-10) within the world';
COMMENT ON COLUMN player_progression.total_stars IS 'Total stars earned across all completed levels';

-- =============================================
-- LEVEL COMPLETIONS TABLE
-- Tracks individual level completions and best scores
-- =============================================
CREATE TABLE IF NOT EXISTS level_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    world INT NOT NULL CHECK (world >= 1 AND world <= 10),
    level INT NOT NULL CHECK (level >= 1 AND level <= 10),
    stars INT DEFAULT 0 CHECK (stars >= 0 AND stars <= 3),
    best_score INT DEFAULT 0 CHECK (best_score >= 0),
    best_words INT DEFAULT 0 CHECK (best_words >= 0),
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, world, level)
);

-- Add comments for documentation
COMMENT ON TABLE level_completions IS 'Records individual level completions with best scores and stars earned';
COMMENT ON COLUMN level_completions.world IS 'World number (1-10)';
COMMENT ON COLUMN level_completions.level IS 'Level within the world (1-10)';
COMMENT ON COLUMN level_completions.stars IS 'Stars earned on this level (0-3)';
COMMENT ON COLUMN level_completions.best_score IS 'Highest score achieved on this level';
COMMENT ON COLUMN level_completions.best_words IS 'Most words found on this level';

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Player progression indexes for leaderboards
CREATE INDEX IF NOT EXISTS idx_player_progression_level
    ON player_progression(player_level DESC);
CREATE INDEX IF NOT EXISTS idx_player_progression_xp
    ON player_progression(xp DESC);
CREATE INDEX IF NOT EXISTS idx_player_progression_stars
    ON player_progression(total_stars DESC);

-- Level completions indexes for queries
CREATE INDEX IF NOT EXISTS idx_level_completions_user
    ON level_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_level_completions_world_level
    ON level_completions(world, level);
CREATE INDEX IF NOT EXISTS idx_level_completions_stars
    ON level_completions(stars DESC);

-- =============================================
-- UPDATED_AT TRIGGER
-- Auto-updates updated_at timestamp on row changes
-- =============================================
CREATE TRIGGER update_player_progression_updated_at
    BEFORE UPDATE ON player_progression
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE player_progression ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_completions ENABLE ROW LEVEL SECURITY;

-- Player progression policies
DROP POLICY IF EXISTS "Users can view own progression" ON player_progression;
CREATE POLICY "Users can view own progression"
    ON player_progression FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own progression" ON player_progression;
CREATE POLICY "Users can insert own progression"
    ON player_progression FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progression" ON player_progression;
CREATE POLICY "Users can update own progression"
    ON player_progression FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Level completions policies
DROP POLICY IF EXISTS "Users can view own completions" ON level_completions;
CREATE POLICY "Users can view own completions"
    ON level_completions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own completions" ON level_completions;
CREATE POLICY "Users can insert own completions"
    ON level_completions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own completions" ON level_completions;
CREATE POLICY "Users can update own completions"
    ON level_completions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS FOR PROGRESSION CALCULATIONS
-- =============================================

-- Function to calculate player level from XP
-- Uses a curved progression: Level N requires N^1.5 * 100 XP
CREATE OR REPLACE FUNCTION calculate_player_level(total_xp INT)
RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    level INT := 1;
    xp_required INT;
BEGIN
    WHILE level < 50 LOOP
        xp_required := (level ^ 1.5 * 100)::INT;
        IF total_xp < xp_required THEN
            RETURN level;
        END IF;
        level := level + 1;
    END LOOP;
    RETURN 50;
END;
$$;

COMMENT ON FUNCTION calculate_player_level IS 'Calculates player level from total XP using curved progression';

-- Function to get XP required for a specific level
CREATE OR REPLACE FUNCTION xp_for_level(target_level INT)
RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF target_level <= 1 THEN
        RETURN 0;
    END IF;
    IF target_level > 50 THEN
        RETURN (50 ^ 1.5 * 100)::INT;
    END IF;
    RETURN (target_level ^ 1.5 * 100)::INT;
END;
$$;

COMMENT ON FUNCTION xp_for_level IS 'Returns XP required to reach a specific level';

-- =============================================
-- HELPER FUNCTION FOR UPSERTING LEVEL COMPLETION
-- =============================================
CREATE OR REPLACE FUNCTION upsert_level_completion(
    p_user_id UUID,
    p_world INT,
    p_level INT,
    p_stars INT,
    p_score INT,
    p_words INT
)
RETURNS level_completions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result level_completions;
    old_stars INT;
    stars_gained INT;
BEGIN
    -- Get existing stars for this level (if any)
    SELECT stars INTO old_stars
    FROM level_completions
    WHERE user_id = p_user_id AND world = p_world AND level = p_level;

    -- Insert or update the completion
    INSERT INTO level_completions (user_id, world, level, stars, best_score, best_words, completed_at)
    VALUES (p_user_id, p_world, p_level, p_stars, p_score, p_words, NOW())
    ON CONFLICT (user_id, world, level)
    DO UPDATE SET
        stars = GREATEST(level_completions.stars, EXCLUDED.stars),
        best_score = GREATEST(level_completions.best_score, EXCLUDED.best_score),
        best_words = GREATEST(level_completions.best_words, EXCLUDED.best_words),
        completed_at = CASE
            WHEN EXCLUDED.stars > level_completions.stars THEN NOW()
            ELSE level_completions.completed_at
        END
    RETURNING * INTO result;

    -- Calculate new stars gained (only count additional stars, not total)
    IF old_stars IS NULL THEN
        stars_gained := result.stars;
    ELSE
        stars_gained := GREATEST(0, result.stars - old_stars);
    END IF;

    -- Update player progression if stars improved
    IF stars_gained > 0 THEN
        UPDATE player_progression
        SET total_stars = total_stars + stars_gained
        WHERE user_id = p_user_id;
    END IF;

    RETURN result;
END;
$$;

COMMENT ON FUNCTION upsert_level_completion IS 'Inserts or updates level completion, keeping best scores and updating total stars';
