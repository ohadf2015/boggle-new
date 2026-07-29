-- Migration: 20260215000000_gamification_enhancements.sql
-- Description: Gamification enhancements - leaderboard snapshots table and new duel/practice achievements
-- Dependencies: 063_education_achievements.sql (achievement_definitions, achievement_tiers tables)
-- Phase: 40-gamification-enhancements

-- ============================================
-- LEADERBOARD SNAPSHOTS TABLE
-- ============================================
-- Stores historical leaderboard snapshots for rank change tracking
-- Captures weekly and monthly snapshots for each student in each classroom

CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    time_scope VARCHAR(10) NOT NULL CHECK (time_scope IN ('weekly', 'monthly')),
    total_xp INTEGER NOT NULL DEFAULT 0,
    rank_position INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(classroom_id, student_id, snapshot_date, time_scope)
);

COMMENT ON TABLE leaderboard_snapshots IS 'Historical leaderboard snapshots for rank change tracking (weekly/monthly)';
COMMENT ON COLUMN leaderboard_snapshots.classroom_id IS 'Classroom the leaderboard belongs to';
COMMENT ON COLUMN leaderboard_snapshots.student_id IS 'Student whose rank is being tracked';
COMMENT ON COLUMN leaderboard_snapshots.snapshot_date IS 'Date the snapshot was taken';
COMMENT ON COLUMN leaderboard_snapshots.time_scope IS 'Time scope: weekly or monthly';
COMMENT ON COLUMN leaderboard_snapshots.total_xp IS 'Student total XP at time of snapshot';
COMMENT ON COLUMN leaderboard_snapshots.rank_position IS 'Student rank position at time of snapshot';

-- ============================================
-- INDEXES
-- ============================================

-- Index for leaderboard snapshot lookup (by classroom and time scope)
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_lookup
    ON leaderboard_snapshots(classroom_id, time_scope, snapshot_date DESC);

-- Index for student snapshot lookup (by student and time scope)
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_student
    ON leaderboard_snapshots(student_id, time_scope, snapshot_date DESC);

-- ============================================
-- ROW-LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- Read policy: authenticated users can read snapshots for classrooms they belong to
CREATE POLICY IF NOT EXISTS "leaderboard_snapshots_read"
    ON leaderboard_snapshots FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM classroom_memberships cm
            WHERE cm.classroom_id = leaderboard_snapshots.classroom_id
            AND cm.student_id = auth.uid()
        )
    );

-- Insert/Update: service role only (snapshots created by server logic, not client)
-- No policies needed for insert/update as only service role will perform these operations

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant SELECT to authenticated users (RLS enforces classroom membership check)
GRANT SELECT ON leaderboard_snapshots TO authenticated;

-- ============================================
-- NEW ACHIEVEMENT DEFINITIONS - DUELS
-- ============================================

-- Duel Champion (skill): Win duels
INSERT INTO achievement_definitions (key, category, base_name_key, base_description_key, icon, is_secret) VALUES
('duel_champion', 'skill', 'achievements.duel_champion.name', 'achievements.duel_champion.description', '⚔️', false);

-- Duel Streak (consistency): Consecutive duel wins
INSERT INTO achievement_definitions (key, category, base_name_key, base_description_key, icon, is_secret) VALUES
('duel_streak', 'consistency', 'achievements.duel_streak.name', 'achievements.duel_streak.description', '🔥', false);

-- Comeback King (skill): Win after being behind
INSERT INTO achievement_definitions (key, category, base_name_key, base_description_key, icon, is_secret) VALUES
('comeback_king', 'skill', 'achievements.comeback_king.name', 'achievements.comeback_king.description', '👑', false);

-- Speed Dueler (skill): Find words fast in realtime duels
INSERT INTO achievement_definitions (key, category, base_name_key, base_description_key, icon, is_secret) VALUES
('speed_dueler', 'skill', 'achievements.speed_dueler.name', 'achievements.speed_dueler.description', '⚡', false);

-- Duel Veteran (progress): Total duels played
INSERT INTO achievement_definitions (key, category, base_name_key, base_description_key, icon, is_secret) VALUES
('duel_veteran', 'progress', 'achievements.duel_veteran.name', 'achievements.duel_veteran.description', '🛡️', false);

-- ============================================
-- NEW ACHIEVEMENT DEFINITIONS - PRACTICE
-- ============================================

-- Spelling Ace (skill): Perfect spelling rounds
INSERT INTO achievement_definitions (key, category, base_name_key, base_description_key, icon, is_secret) VALUES
('spelling_ace', 'skill', 'achievements.spelling_ace.name', 'achievements.spelling_ace.description', '⭐', false);

-- Matching Master (skill): Fast matching completions
INSERT INTO achievement_definitions (key, category, base_name_key, base_description_key, icon, is_secret) VALUES
('matching_master', 'skill', 'achievements.matching_master.name', 'achievements.matching_master.description', '🧩', false);

-- Blitz Champion (skill): High blitz scores
INSERT INTO achievement_definitions (key, category, base_name_key, base_description_key, icon, is_secret) VALUES
('blitz_champion', 'skill', 'achievements.blitz_champion.name', 'achievements.blitz_champion.description', '🚀', false);

-- Practice Streak (consistency): Consecutive days of practice
INSERT INTO achievement_definitions (key, category, base_name_key, base_description_key, icon, is_secret) VALUES
('practice_streak', 'consistency', 'achievements.practice_streak.name', 'achievements.practice_streak.description', '📅', false);

-- Mode Master (exploration): Complete sessions in all practice modes
INSERT INTO achievement_definitions (key, category, base_name_key, base_description_key, icon, is_secret) VALUES
('mode_master', 'exploration', 'achievements.mode_master.name', 'achievements.mode_master.description', '🧭', false);

-- ============================================
-- ACHIEVEMENT TIERS - DUEL ACHIEVEMENTS
-- ============================================

-- duel_champion (3/10/25/50 wins)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 3, 1 FROM achievement_definitions WHERE key = 'duel_champion'
UNION ALL SELECT id, 'silver', 10, 2 FROM achievement_definitions WHERE key = 'duel_champion'
UNION ALL SELECT id, 'gold', 25, 3 FROM achievement_definitions WHERE key = 'duel_champion'
UNION ALL SELECT id, 'platinum', 50, 4 FROM achievement_definitions WHERE key = 'duel_champion';

-- duel_streak (3/5/10/20 consecutive wins)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 3, 1 FROM achievement_definitions WHERE key = 'duel_streak'
UNION ALL SELECT id, 'silver', 5, 2 FROM achievement_definitions WHERE key = 'duel_streak'
UNION ALL SELECT id, 'gold', 10, 3 FROM achievement_definitions WHERE key = 'duel_streak'
UNION ALL SELECT id, 'platinum', 20, 4 FROM achievement_definitions WHERE key = 'duel_streak';

-- comeback_king (1/5/15/30 comebacks)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 1, 1 FROM achievement_definitions WHERE key = 'comeback_king'
UNION ALL SELECT id, 'silver', 5, 2 FROM achievement_definitions WHERE key = 'comeback_king'
UNION ALL SELECT id, 'gold', 15, 3 FROM achievement_definitions WHERE key = 'comeback_king'
UNION ALL SELECT id, 'platinum', 30, 4 FROM achievement_definitions WHERE key = 'comeback_king';

-- speed_dueler (5/15/30/50 fast words)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 5, 1 FROM achievement_definitions WHERE key = 'speed_dueler'
UNION ALL SELECT id, 'silver', 15, 2 FROM achievement_definitions WHERE key = 'speed_dueler'
UNION ALL SELECT id, 'gold', 30, 3 FROM achievement_definitions WHERE key = 'speed_dueler'
UNION ALL SELECT id, 'platinum', 50, 4 FROM achievement_definitions WHERE key = 'speed_dueler';

-- duel_veteran (5/20/50/100 duels played)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 5, 1 FROM achievement_definitions WHERE key = 'duel_veteran'
UNION ALL SELECT id, 'silver', 20, 2 FROM achievement_definitions WHERE key = 'duel_veteran'
UNION ALL SELECT id, 'gold', 50, 3 FROM achievement_definitions WHERE key = 'duel_veteran'
UNION ALL SELECT id, 'platinum', 100, 4 FROM achievement_definitions WHERE key = 'duel_veteran';

-- ============================================
-- ACHIEVEMENT TIERS - PRACTICE ACHIEVEMENTS
-- ============================================

-- spelling_ace (5/15/50/100 perfect rounds)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 5, 1 FROM achievement_definitions WHERE key = 'spelling_ace'
UNION ALL SELECT id, 'silver', 15, 2 FROM achievement_definitions WHERE key = 'spelling_ace'
UNION ALL SELECT id, 'gold', 50, 3 FROM achievement_definitions WHERE key = 'spelling_ace'
UNION ALL SELECT id, 'platinum', 100, 4 FROM achievement_definitions WHERE key = 'spelling_ace';

-- matching_master (10/30/75/150 fast completions)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 10, 1 FROM achievement_definitions WHERE key = 'matching_master'
UNION ALL SELECT id, 'silver', 30, 2 FROM achievement_definitions WHERE key = 'matching_master'
UNION ALL SELECT id, 'gold', 75, 3 FROM achievement_definitions WHERE key = 'matching_master'
UNION ALL SELECT id, 'platinum', 150, 4 FROM achievement_definitions WHERE key = 'matching_master';

-- blitz_champion (3/10/25/50 high scores 500+)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 3, 1 FROM achievement_definitions WHERE key = 'blitz_champion'
UNION ALL SELECT id, 'silver', 10, 2 FROM achievement_definitions WHERE key = 'blitz_champion'
UNION ALL SELECT id, 'gold', 25, 3 FROM achievement_definitions WHERE key = 'blitz_champion'
UNION ALL SELECT id, 'platinum', 50, 4 FROM achievement_definitions WHERE key = 'blitz_champion';

-- practice_streak (3/7/14/30 consecutive days)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 3, 1 FROM achievement_definitions WHERE key = 'practice_streak'
UNION ALL SELECT id, 'silver', 7, 2 FROM achievement_definitions WHERE key = 'practice_streak'
UNION ALL SELECT id, 'gold', 14, 3 FROM achievement_definitions WHERE key = 'practice_streak'
UNION ALL SELECT id, 'platinum', 30, 4 FROM achievement_definitions WHERE key = 'practice_streak';

-- mode_master (2/3/4/5 different modes)
INSERT INTO achievement_tiers (achievement_id, tier, threshold, tier_order)
SELECT id, 'bronze', 2, 1 FROM achievement_definitions WHERE key = 'mode_master'
UNION ALL SELECT id, 'silver', 3, 2 FROM achievement_definitions WHERE key = 'mode_master'
UNION ALL SELECT id, 'gold', 4, 3 FROM achievement_definitions WHERE key = 'mode_master'
UNION ALL SELECT id, 'platinum', 5, 4 FROM achievement_definitions WHERE key = 'mode_master';
