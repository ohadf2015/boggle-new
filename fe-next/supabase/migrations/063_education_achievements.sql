-- Migration: 063_education_achievements.sql
-- Description: Achievement system for education mode - badges, tiers, and student tracking
-- Dependencies: 056_teacher_vocabulary_builder.sql (users table with user_role)
-- Phase: 19-achievement-system

-- ============================================
-- ACHIEVEMENT DEFINITIONS TABLE
-- ============================================
-- Reference table with all 18 achievement definitions
-- Seeded with achievement data (progress, skill, consistency, exploration)

CREATE TABLE IF NOT EXISTS achievement_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('progress', 'skill', 'consistency', 'exploration')),
    base_name_key VARCHAR(100) NOT NULL, -- Translation key e.g., 'achievements.word_master.name'
    base_description_key VARCHAR(100) NOT NULL, -- Translation key e.g., 'achievements.word_master.description'
    icon VARCHAR(10) NOT NULL, -- Emoji
    is_secret BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE achievement_definitions IS 'Reference table with all achievement definitions (18 badges)';
COMMENT ON COLUMN achievement_definitions.key IS 'Unique identifier (e.g., word_master, streak_champion)';
COMMENT ON COLUMN achievement_definitions.category IS 'Achievement category: progress, skill, consistency, exploration';
COMMENT ON COLUMN achievement_definitions.base_name_key IS 'Translation key for achievement name';
COMMENT ON COLUMN achievement_definitions.base_description_key IS 'Translation key for achievement description';
COMMENT ON COLUMN achievement_definitions.is_secret IS 'Secret achievements (5-10%) show no progress until unlocked';

-- ============================================
-- ACHIEVEMENT TIERS TABLE
-- ============================================
-- Defines Bronze/Silver/Gold/Platinum thresholds for each achievement

CREATE TABLE IF NOT EXISTS achievement_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    achievement_id UUID NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
    tier VARCHAR(10) NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    threshold INTEGER NOT NULL CHECK (threshold > 0),
    tier_order INTEGER NOT NULL CHECK (tier_order BETWEEN 1 AND 4),
    UNIQUE(achievement_id, tier),
    UNIQUE(achievement_id, tier_order)
);

COMMENT ON TABLE achievement_tiers IS 'Threshold values for each achievement tier (Bronze/Silver/Gold/Platinum)';
COMMENT ON COLUMN achievement_tiers.tier IS 'Tier name: bronze, silver, gold, platinum';
COMMENT ON COLUMN achievement_tiers.threshold IS 'Progress value required to unlock this tier';
COMMENT ON COLUMN achievement_tiers.tier_order IS 'Sorting order (1=bronze, 2=silver, 3=gold, 4=platinum)';

-- ============================================
-- STUDENT ACHIEVEMENTS TABLE
-- ============================================
-- Tracks earned achievements and progress for each student

CREATE TABLE IF NOT EXISTS student_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
    current_tier VARCHAR(10) NOT NULL CHECK (current_tier IN ('bronze', 'silver', 'gold', 'platinum')),
    progress_value INTEGER NOT NULL DEFAULT 0 CHECK (progress_value >= 0),
    is_pinned BOOLEAN DEFAULT false,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_tier_unlock TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, achievement_id)
);

COMMENT ON TABLE student_achievements IS 'Student achievement records - tracks earned badges and progress';
COMMENT ON COLUMN student_achievements.current_tier IS 'Highest tier unlocked (bronze/silver/gold/platinum)';
COMMENT ON COLUMN student_achievements.progress_value IS 'Current progress toward next tier';
COMMENT ON COLUMN student_achievements.is_pinned IS 'Student can pin up to 3 achievements to profile';
COMMENT ON COLUMN student_achievements.unlocked_at IS 'When achievement was first unlocked (bronze tier)';
COMMENT ON COLUMN student_achievements.last_tier_unlock IS 'When current tier was unlocked';

-- ============================================
-- SEED ACHIEVEMENT DEFINITIONS
-- ============================================
-- 18 achievements across 4 categories

-- Progress Milestones (5 achievements)
INSERT INTO achievement_definitions (key, category, base_name_key, base_description_key, icon, is_secret) VALUES
('first_lesson', 'progress', 'achievements.first_lesson.name', 'achievements.first_lesson.description', '📚', false),
('word_master', 'progress', 'achievements.word_master.name', 'achievements.word_master.description', '🎓', false),
('level_climber', 'progress', 'achievements.level_climber.name', 'achievements.level_climber.description', '⬆️', false),
('xp_collector', 'progress', 'achievements.xp_collector.name', 'achievements.xp_collector.description', '💎', false),
('practice_veteran', 'progress', 'achievements.practice_veteran.name', 'achievements.practice_veteran.description', '🎖️', false);

-- Skill-Based (4 achievements)
INSERT INTO achievement_definitions (key, category, base_name_key, base_description_key, icon, is_secret) VALUES
('speed_demon', 'skill', 'achievements.speed_demon.name', 'achievements.speed_demon.description', '⚡', false),
('perfect_streak', 'skill', 'achievements.perfect_streak.name', 'achievements.perfect_streak.description', '✨', false),
('boss_slayer', 'skill', 'achievements.boss_slayer.name', 'achievements.boss_slayer.description', '🗡️', false),
('combo_master', 'skill', 'achievements.combo_master.name', 'achievements.combo_master.description', '🔥', false);

-- Consistency (5 achievements)
INSERT INTO achievement_definitions (key, category, base_name_key, base_description_key, icon, is_secret) VALUES
('streak_starter', 'consistency', 'achievements.streak_starter.name', 'achievements.streak_starter.description', '🔥', false),
('early_bird', 'consistency', 'achievements.early_bird.name', 'achievements.early_bird.description', '🌅', false),
('dedicated_learner', 'consistency', 'achievements.dedicated_learner.name', 'achievements.dedicated_learner.description', '📅', false),
('weekly_warrior', 'consistency', 'achievements.weekly_warrior.name', 'achievements.weekly_warrior.description', '⚔️', false),
('streak_champion', 'consistency', 'achievements.streak_champion.name', 'achievements.streak_champion.description', '👑', true); -- SECRET

-- Exploration (4 achievements)
INSERT INTO achievement_definitions (key, category, base_name_key, base_description_key, icon, is_secret) VALUES
('mode_explorer', 'exploration', 'achievements.mode_explorer.name', 'achievements.mode_explorer.description', '🧭', false),
('lesson_collector', 'exploration', 'achievements.lesson_collector.name', 'achievements.lesson_collector.description', '📖', false),
('classroom_contributor', 'exploration', 'achievements.classroom_contributor.name', 'achievements.classroom_contributor.description', '👥', false),
('word_variety', 'exploration', 'achievements.word_variety.name', 'achievements.word_variety.description', '🌈', true); -- SECRET

-- ============================================
-- SEED ACHIEVEMENT TIERS
-- ============================================
-- Each achievement has 4 tiers: Bronze/Silver/Gold/Platinum

-- first_lesson (1/3/10/25 lessons completed)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 1, 1 FROM achievement_definitions WHERE key = 'first_lesson'
UNION ALL SELECT id, 'silver', 3, 2 FROM achievement_definitions WHERE key = 'first_lesson'
UNION ALL SELECT id, 'gold', 10, 3 FROM achievement_definitions WHERE key = 'first_lesson'
UNION ALL SELECT id, 'platinum', 25, 4 FROM achievement_definitions WHERE key = 'first_lesson';

-- word_master (50/150/500/1000 words mastered)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 50, 1 FROM achievement_definitions WHERE key = 'word_master'
UNION ALL SELECT id, 'silver', 150, 2 FROM achievement_definitions WHERE key = 'word_master'
UNION ALL SELECT id, 'gold', 500, 3 FROM achievement_definitions WHERE key = 'word_master'
UNION ALL SELECT id, 'platinum', 1000, 4 FROM achievement_definitions WHERE key = 'word_master';

-- level_climber (5/10/25/50 levels reached)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 5, 1 FROM achievement_definitions WHERE key = 'level_climber'
UNION ALL SELECT id, 'silver', 10, 2 FROM achievement_definitions WHERE key = 'level_climber'
UNION ALL SELECT id, 'gold', 25, 3 FROM achievement_definitions WHERE key = 'level_climber'
UNION ALL SELECT id, 'platinum', 50, 4 FROM achievement_definitions WHERE key = 'level_climber';

-- xp_collector (500/2000/10000/50000 XP)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 500, 1 FROM achievement_definitions WHERE key = 'xp_collector'
UNION ALL SELECT id, 'silver', 2000, 2 FROM achievement_definitions WHERE key = 'xp_collector'
UNION ALL SELECT id, 'gold', 10000, 3 FROM achievement_definitions WHERE key = 'xp_collector'
UNION ALL SELECT id, 'platinum', 50000, 4 FROM achievement_definitions WHERE key = 'xp_collector';

-- practice_veteran (10/50/200/500 practice sessions)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 10, 1 FROM achievement_definitions WHERE key = 'practice_veteran'
UNION ALL SELECT id, 'silver', 50, 2 FROM achievement_definitions WHERE key = 'practice_veteran'
UNION ALL SELECT id, 'gold', 200, 3 FROM achievement_definitions WHERE key = 'practice_veteran'
UNION ALL SELECT id, 'platinum', 500, 4 FROM achievement_definitions WHERE key = 'practice_veteran';

-- speed_demon (10/25/50/100 words in single game)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 10, 1 FROM achievement_definitions WHERE key = 'speed_demon'
UNION ALL SELECT id, 'silver', 25, 2 FROM achievement_definitions WHERE key = 'speed_demon'
UNION ALL SELECT id, 'gold', 50, 3 FROM achievement_definitions WHERE key = 'speed_demon'
UNION ALL SELECT id, 'platinum', 100, 4 FROM achievement_definitions WHERE key = 'speed_demon';

-- perfect_streak (5/10/25/50 perfect accuracy games)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 5, 1 FROM achievement_definitions WHERE key = 'perfect_streak'
UNION ALL SELECT id, 'silver', 10, 2 FROM achievement_definitions WHERE key = 'perfect_streak'
UNION ALL SELECT id, 'gold', 25, 3 FROM achievement_definitions WHERE key = 'perfect_streak'
UNION ALL SELECT id, 'platinum', 50, 4 FROM achievement_definitions WHERE key = 'perfect_streak';

-- boss_slayer (1/5/15/30 bosses defeated)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 1, 1 FROM achievement_definitions WHERE key = 'boss_slayer'
UNION ALL SELECT id, 'silver', 5, 2 FROM achievement_definitions WHERE key = 'boss_slayer'
UNION ALL SELECT id, 'gold', 15, 3 FROM achievement_definitions WHERE key = 'boss_slayer'
UNION ALL SELECT id, 'platinum', 30, 4 FROM achievement_definitions WHERE key = 'boss_slayer';

-- combo_master (5/15/50/100 combos achieved)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 5, 1 FROM achievement_definitions WHERE key = 'combo_master'
UNION ALL SELECT id, 'silver', 15, 2 FROM achievement_definitions WHERE key = 'combo_master'
UNION ALL SELECT id, 'gold', 50, 3 FROM achievement_definitions WHERE key = 'combo_master'
UNION ALL SELECT id, 'platinum', 100, 4 FROM achievement_definitions WHERE key = 'combo_master';

-- streak_starter (3/7/14/30 day streaks)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 3, 1 FROM achievement_definitions WHERE key = 'streak_starter'
UNION ALL SELECT id, 'silver', 7, 2 FROM achievement_definitions WHERE key = 'streak_starter'
UNION ALL SELECT id, 'gold', 14, 3 FROM achievement_definitions WHERE key = 'streak_starter'
UNION ALL SELECT id, 'platinum', 30, 4 FROM achievement_definitions WHERE key = 'streak_starter';

-- early_bird (5/15/30/60 morning practices before 9am)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 5, 1 FROM achievement_definitions WHERE key = 'early_bird'
UNION ALL SELECT id, 'silver', 15, 2 FROM achievement_definitions WHERE key = 'early_bird'
UNION ALL SELECT id, 'gold', 30, 3 FROM achievement_definitions WHERE key = 'early_bird'
UNION ALL SELECT id, 'platinum', 60, 4 FROM achievement_definitions WHERE key = 'early_bird';

-- dedicated_learner (5/10/20/30 days in a month)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 5, 1 FROM achievement_definitions WHERE key = 'dedicated_learner'
UNION ALL SELECT id, 'silver', 10, 2 FROM achievement_definitions WHERE key = 'dedicated_learner'
UNION ALL SELECT id, 'gold', 20, 3 FROM achievement_definitions WHERE key = 'dedicated_learner'
UNION ALL SELECT id, 'platinum', 30, 4 FROM achievement_definitions WHERE key = 'dedicated_learner';

-- weekly_warrior (1/4/12/26 weeks with 5+ days practice)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 1, 1 FROM achievement_definitions WHERE key = 'weekly_warrior'
UNION ALL SELECT id, 'silver', 4, 2 FROM achievement_definitions WHERE key = 'weekly_warrior'
UNION ALL SELECT id, 'gold', 12, 3 FROM achievement_definitions WHERE key = 'weekly_warrior'
UNION ALL SELECT id, 'platinum', 26, 4 FROM achievement_definitions WHERE key = 'weekly_warrior';

-- streak_champion (7/30/90/365 day longest streak, SECRET)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 7, 1 FROM achievement_definitions WHERE key = 'streak_champion'
UNION ALL SELECT id, 'silver', 30, 2 FROM achievement_definitions WHERE key = 'streak_champion'
UNION ALL SELECT id, 'gold', 90, 3 FROM achievement_definitions WHERE key = 'streak_champion'
UNION ALL SELECT id, 'platinum', 365, 4 FROM achievement_definitions WHERE key = 'streak_champion';

-- mode_explorer (2/3/4/4 practice modes tried)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 2, 1 FROM achievement_definitions WHERE key = 'mode_explorer'
UNION ALL SELECT id, 'silver', 3, 2 FROM achievement_definitions WHERE key = 'mode_explorer'
UNION ALL SELECT id, 'gold', 4, 3 FROM achievement_definitions WHERE key = 'mode_explorer'
UNION ALL SELECT id, 'platinum', 4, 4 FROM achievement_definitions WHERE key = 'mode_explorer';

-- lesson_collector (3/10/25/50 different lessons completed)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 3, 1 FROM achievement_definitions WHERE key = 'lesson_collector'
UNION ALL SELECT id, 'silver', 10, 2 FROM achievement_definitions WHERE key = 'lesson_collector'
UNION ALL SELECT id, 'gold', 25, 3 FROM achievement_definitions WHERE key = 'lesson_collector'
UNION ALL SELECT id, 'platinum', 50, 4 FROM achievement_definitions WHERE key = 'lesson_collector';

-- classroom_contributor (1/3/5/10 classrooms joined)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 1, 1 FROM achievement_definitions WHERE key = 'classroom_contributor'
UNION ALL SELECT id, 'silver', 3, 2 FROM achievement_definitions WHERE key = 'classroom_contributor'
UNION ALL SELECT id, 'gold', 5, 3 FROM achievement_definitions WHERE key = 'classroom_contributor'
UNION ALL SELECT id, 'platinum', 10, 4 FROM achievement_definitions WHERE key = 'classroom_contributor';

-- word_variety (50/200/500/1000 unique words found, SECRET)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 50, 1 FROM achievement_definitions WHERE key = 'word_variety'
UNION ALL SELECT id, 'silver', 200, 2 FROM achievement_definitions WHERE key = 'word_variety'
UNION ALL SELECT id, 'gold', 500, 3 FROM achievement_definitions WHERE key = 'word_variety'
UNION ALL SELECT id, 'platinum', 1000, 4 FROM achievement_definitions WHERE key = 'word_variety';

-- ============================================
-- ROW-LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_achievements ENABLE ROW LEVEL SECURITY;

-- achievement_definitions: Anyone authenticated can read
CREATE POLICY IF NOT EXISTS "achievement_definitions_read"
    ON achievement_definitions FOR SELECT
    TO authenticated
    USING (true);

-- achievement_tiers: Anyone authenticated can read
CREATE POLICY IF NOT EXISTS "achievement_tiers_read"
    ON achievement_tiers FOR SELECT
    TO authenticated
    USING (true);

-- student_achievements: Students can read their own achievements
CREATE POLICY IF NOT EXISTS "student_achievements_read_own"
    ON student_achievements FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

-- student_achievements: Students can read achievements of classmates in same classroom
CREATE POLICY IF NOT EXISTS "student_achievements_read_classmates"
    ON student_achievements FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM classroom_members cm1
            JOIN classroom_members cm2 ON cm1.classroom_id = cm2.classroom_id
            WHERE cm1.student_id = auth.uid()
            AND cm2.student_id = student_achievements.student_id
        )
    );

-- student_achievements: Students can insert their own achievements
CREATE POLICY IF NOT EXISTS "student_achievements_insert_own"
    ON student_achievements FOR INSERT
    TO authenticated
    WITH CHECK (student_id = auth.uid());

-- student_achievements: Students can update their own achievements
CREATE POLICY IF NOT EXISTS "student_achievements_update_own"
    ON student_achievements FOR UPDATE
    TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- Index for student achievement lookup (profile display)
CREATE INDEX IF NOT EXISTS idx_student_achievements_student
    ON student_achievements(student_id, unlocked_at DESC);

-- Index for pinned achievements lookup
CREATE INDEX IF NOT EXISTS idx_student_achievements_pinned
    ON student_achievements(student_id, is_pinned)
    WHERE is_pinned = true;

-- Index for tier lookup (calculating next tier)
CREATE INDEX IF NOT EXISTS idx_achievement_tiers_lookup
    ON achievement_tiers(achievement_id, tier_order);

-- Index for achievement category queries
CREATE INDEX IF NOT EXISTS idx_achievement_definitions_category
    ON achievement_definitions(category);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant table access to authenticated users
GRANT SELECT ON achievement_definitions TO authenticated;
GRANT SELECT ON achievement_tiers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON student_achievements TO authenticated;
