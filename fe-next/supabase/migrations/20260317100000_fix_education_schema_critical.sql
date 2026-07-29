-- Migration: 20260317100000_fix_education_schema_critical.sql
-- Description: Fix critical education schema issues found during expert audit
-- Fixes: C1 (student_achievements FK), C2 (classroom_members typo), C3 (practice_sessions schema),
--        C4 (missing challenge tables), H1 (XP direct UPDATE), H2 (self-INSERT achievements),
--        H4 (level formula mismatch), M12 (missing indexes)

-- ============================================
-- C1: Fix student_achievements FK reference
-- Was: REFERENCES users(id) — table doesn't exist
-- Fix: Recreate with REFERENCES auth.users(id)
-- ============================================

-- Drop the broken FK constraint and add correct one
-- Note: constraint name is auto-generated, so we alter the column reference
DO $$
BEGIN
  -- Drop existing FK if it exists (references non-existent 'users' table)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'student_achievements'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%student_id%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE student_achievements DROP CONSTRAINT ' || constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'student_achievements'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%student_id%'
      LIMIT 1
    );
  END IF;
END $$;

-- Add correct FK to auth.users
ALTER TABLE student_achievements
  ADD CONSTRAINT student_achievements_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================
-- C2: Fix classmate achievement visibility RLS
-- Was: classroom_members (doesn't exist)
-- Fix: classroom_memberships (correct table name)
-- ============================================

DROP POLICY IF EXISTS "student_achievements_read_classmates" ON student_achievements;
CREATE POLICY "student_achievements_read_classmates"
    ON student_achievements FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM classroom_memberships cm1
            JOIN classroom_memberships cm2 ON cm1.classroom_id = cm2.classroom_id
            WHERE cm1.student_id = auth.uid()
            AND cm2.student_id = student_achievements.student_id
        )
    );

-- ============================================
-- C3: Reconcile practice_sessions schema
-- Migration 058 created it with (practice_type, cards_reviewed, cards_correct, words_found, etc.)
-- Migration 20260213 tried to create with (mode, accuracy, words_attempted, etc.) but IF NOT EXISTS skipped
-- Fix: Add missing columns from both schemas
-- ============================================

-- Add columns from 20260213 that may be missing (IF NOT EXISTS via DO block)
DO $$
BEGIN
  -- mode column (maps to practice_type in 058)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'practice_sessions' AND column_name = 'mode') THEN
    ALTER TABLE practice_sessions ADD COLUMN mode VARCHAR(20);
  END IF;

  -- accuracy
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'practice_sessions' AND column_name = 'accuracy') THEN
    ALTER TABLE practice_sessions ADD COLUMN accuracy REAL;
  END IF;

  -- words_attempted
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'practice_sessions' AND column_name = 'words_attempted') THEN
    ALTER TABLE practice_sessions ADD COLUMN words_attempted INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- words_correct
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'practice_sessions' AND column_name = 'words_correct') THEN
    ALTER TABLE practice_sessions ADD COLUMN words_correct INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- xp_awarded
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'practice_sessions' AND column_name = 'xp_awarded') THEN
    ALTER TABLE practice_sessions ADD COLUMN xp_awarded INTEGER DEFAULT 0;
  END IF;

  -- classroom_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'practice_sessions' AND column_name = 'classroom_id') THEN
    ALTER TABLE practice_sessions ADD COLUMN classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL;
  END IF;

  -- score (generic)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'practice_sessions' AND column_name = 'score') THEN
    ALTER TABLE practice_sessions ADD COLUMN score INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- duration_seconds
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'practice_sessions' AND column_name = 'duration_seconds') THEN
    ALTER TABLE practice_sessions ADD COLUMN duration_seconds INTEGER;
  END IF;

  -- results JSONB
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'practice_sessions' AND column_name = 'results') THEN
    ALTER TABLE practice_sessions ADD COLUMN results JSONB;
  END IF;

  -- max_combo
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'practice_sessions' AND column_name = 'max_combo') THEN
    ALTER TABLE practice_sessions ADD COLUMN max_combo INTEGER DEFAULT 0;
  END IF;
END $$;

-- Sync mode from practice_type for existing rows
UPDATE practice_sessions SET mode = practice_type WHERE mode IS NULL AND practice_type IS NOT NULL;

-- ============================================
-- C4: Create missing daily_challenges and weekly_quests tables
-- Referenced by challenges.ts but never created
-- ============================================

CREATE TABLE IF NOT EXISTS daily_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_date DATE NOT NULL,
    challenge_type VARCHAR(30) NOT NULL,
    challenge_tier VARCHAR(10) NOT NULL CHECK (challenge_tier IN ('easy', 'medium', 'hard')),
    title VARCHAR(100) NOT NULL,
    description VARCHAR(200) NOT NULL,
    target_value INTEGER NOT NULL,
    current_value INTEGER NOT NULL DEFAULT 0,
    xp_reward INTEGER NOT NULL,
    bonus_reward JSONB,
    completed BOOLEAN NOT NULL DEFAULT false,
    claimed BOOLEAN NOT NULL DEFAULT false,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(player_id, challenge_date, challenge_type)
);

CREATE TABLE IF NOT EXISTS weekly_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    quest_type VARCHAR(30) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(200) NOT NULL,
    requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
    current_progress JSONB NOT NULL DEFAULT '{}'::jsonb,
    xp_reward INTEGER NOT NULL,
    bonus_rewards JSONB,
    completed BOOLEAN NOT NULL DEFAULT false,
    claimed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(player_id, week_start, quest_type)
);

-- RLS for daily_challenges
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players read own daily challenges"
    ON daily_challenges FOR SELECT TO authenticated
    USING (player_id = auth.uid());

CREATE POLICY "Service role manages daily challenges"
    ON daily_challenges FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Allow the server (via admin client) to insert/update challenges
-- Students should NOT be able to insert/update directly
GRANT SELECT ON daily_challenges TO authenticated;

-- RLS for weekly_quests
ALTER TABLE weekly_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players read own weekly quests"
    ON weekly_quests FOR SELECT TO authenticated
    USING (player_id = auth.uid());

CREATE POLICY "Service role manages weekly quests"
    ON weekly_quests FOR ALL TO service_role
    USING (true) WITH CHECK (true);

GRANT SELECT ON weekly_quests TO authenticated;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_challenges_player_date
    ON daily_challenges(player_id, challenge_date);

CREATE INDEX IF NOT EXISTS idx_weekly_quests_player_week
    ON weekly_quests(player_id, week_start);

-- ============================================
-- H1: Lock down student_lesson_progress XP
-- Students should NOT be able to directly UPDATE total_xp
-- Only the SECURITY DEFINER award_education_xp RPC should modify XP
-- Fix: Add trigger that rejects direct XP manipulation
-- ============================================

CREATE OR REPLACE FUNCTION prevent_direct_xp_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow SECURITY DEFINER functions (like award_education_xp) to modify XP
  -- Block direct client UPDATE attempts
  IF NEW.total_xp != OLD.total_xp AND current_setting('role') != 'rls_definer' THEN
    -- Check if called from a SECURITY DEFINER context
    -- SECURITY DEFINER functions run as the function owner, not the caller
    -- We check if session_user != current_user (SECURITY DEFINER switches current_user)
    IF session_user = current_user THEN
      -- Direct client call - reject XP change
      NEW.total_xp := OLD.total_xp;
      NEW.current_level := OLD.current_level;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_direct_xp_manipulation ON student_lesson_progress;
CREATE TRIGGER prevent_direct_xp_manipulation
    BEFORE UPDATE ON student_lesson_progress
    FOR EACH ROW
    EXECUTE FUNCTION prevent_direct_xp_update();

-- ============================================
-- H2: Remove student self-INSERT on achievements
-- Achievements should only be granted server-side
-- ============================================

DROP POLICY IF EXISTS "student_achievements_insert_own" ON student_achievements;
-- Replace with service_role only insert
CREATE POLICY "service_role_insert_achievements"
    ON student_achievements FOR INSERT
    TO service_role
    WITH CHECK (true);

-- ============================================
-- H4: Fix level formula to match xpManager.ts segmented curve
-- Old: FLOOR(SQRT(total_xp / 100)) — simple square root
-- New: Binary search over 100 * level^exponent (segmented: 1.4/1.45/1.5/1.55)
-- ============================================

CREATE OR REPLACE FUNCTION update_student_level()
RETURNS TRIGGER AS $$
DECLARE
    new_level INTEGER;
    test_level INTEGER;
    xp_for_level INTEGER;
    exponent NUMERIC;
BEGIN
    -- Binary search matching xpManager.ts getLevelFromXp
    -- Formula: XP_FOR_LEVEL = 100 * level^exponent
    -- Segmented exponents: 1-25=1.4, 26-50=1.45, 51-75=1.5, 76+=1.55
    new_level := 1;

    FOR test_level IN 2..100 LOOP
        -- Determine exponent based on level tier
        IF test_level <= 25 THEN
            exponent := 1.4;
        ELSIF test_level <= 50 THEN
            exponent := 1.45;
        ELSIF test_level <= 75 THEN
            exponent := 1.5;
        ELSE
            exponent := 1.55;
        END IF;

        xp_for_level := ROUND(100 * POWER(test_level, exponent));

        IF xp_for_level > NEW.total_xp THEN
            EXIT; -- Found the level boundary
        END IF;

        new_level := test_level;
    END LOOP;

    -- Cap at max level 100
    NEW.current_level := LEAST(new_level, 100);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger already exists from 062, function is replaced in-place

-- ============================================
-- M12: Missing composite indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_student_lesson_progress_student_lesson
    ON student_lesson_progress(student_id, lesson_id);

CREATE INDEX IF NOT EXISTS idx_lesson_assignments_classroom_lesson
    ON lesson_assignments(classroom_id, lesson_id);

CREATE INDEX IF NOT EXISTS idx_student_achievements_student_tier
    ON student_achievements(student_id, current_tier);

-- ============================================
-- Fix mode_explorer platinum threshold (was same as gold: 4)
-- ============================================

UPDATE achievement_tiers
SET threshold = 7
FROM achievement_definitions
WHERE achievement_tiers.achievement_id = achievement_definitions.id
AND achievement_definitions.key = 'mode_explorer'
AND achievement_tiers.tier = 'platinum';
