-- =============================================
-- FIX WORD HUNT STREAK CALCULATION
-- Migration: 067_fix_word_hunt_streak_calculation
-- Created: 2026-01-31
--
-- Fixes: Streak not being calculated/updated in trigger
-- Root cause: The update_word_hunt_player_stats() function only set
-- streak=0 on insert and never calculated streaks based on
-- consecutive play days.
--
-- This migration replaces the trigger function with proper streak
-- calculation logic that checks if the player played yesterday.
-- =============================================

-- Drop and recreate the function with proper streak calculation
CREATE OR REPLACE FUNCTION update_word_hunt_player_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_stats_id UUID;
  v_attempt_column TEXT;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_last_played_date DATE;
  v_today DATE := NEW.puzzle_date;
  v_yesterday DATE := NEW.puzzle_date - INTERVAL '1 day';
BEGIN
  -- ============================================
  -- STEP 1: Get or create stats record and fetch existing streak data
  -- ============================================

  IF NEW.player_id IS NOT NULL THEN
    -- For authenticated users
    SELECT id, current_streak, longest_streak, last_played_date
    INTO v_stats_id, v_current_streak, v_longest_streak, v_last_played_date
    FROM word_hunt_player_stats
    WHERE player_id = NEW.player_id;

    IF NOT FOUND THEN
      -- Create new stats record for user
      INSERT INTO word_hunt_player_stats (player_id, total_played, total_solved, current_streak, longest_streak, last_played_date)
      VALUES (NEW.player_id, 0, 0, 0, 0, NULL)
      RETURNING id INTO v_stats_id;

      v_current_streak := 0;
      v_longest_streak := 0;
      v_last_played_date := NULL;
    END IF;

  ELSIF NEW.guest_fingerprint IS NOT NULL THEN
    -- For guest users
    SELECT id, current_streak, longest_streak, last_played_date
    INTO v_stats_id, v_current_streak, v_longest_streak, v_last_played_date
    FROM word_hunt_player_stats
    WHERE guest_fingerprint = NEW.guest_fingerprint;

    IF NOT FOUND THEN
      -- Create new stats record for guest
      INSERT INTO word_hunt_player_stats (guest_fingerprint, total_played, total_solved, current_streak, longest_streak, last_played_date)
      VALUES (NEW.guest_fingerprint, 0, 0, 0, 0, NULL)
      RETURNING id INTO v_stats_id;

      v_current_streak := 0;
      v_longest_streak := 0;
      v_last_played_date := NULL;
    END IF;

  ELSE
    RETURN NEW; -- No valid identifier, skip stats update
  END IF;

  -- ============================================
  -- STEP 2: Calculate streak (only for solved attempts)
  -- ============================================

  -- Only update streak if player solved the puzzle
  IF NEW.solved THEN
    -- Check if this is the same day (already played today - don't change streak)
    IF v_last_played_date = v_today THEN
      -- Already played today, don't modify streak
      NULL;
    -- Check if played yesterday (continue streak)
    ELSIF v_last_played_date = v_yesterday THEN
      v_current_streak := COALESCE(v_current_streak, 0) + 1;
      -- Update longest streak if current is higher
      IF v_current_streak > COALESCE(v_longest_streak, 0) THEN
        v_longest_streak := v_current_streak;
      END IF;
    -- Didn't play yesterday (start new streak)
    ELSE
      v_current_streak := 1;
      -- Only update longest if current streak is now the longest (first time or previous was 0)
      IF v_current_streak > COALESCE(v_longest_streak, 0) THEN
        v_longest_streak := v_current_streak;
      END IF;
    END IF;
  ELSE
    -- Failed to solve - streak is broken (reset to 0)
    -- Only reset if they haven't already played today
    IF v_last_played_date IS NULL OR v_last_played_date < v_today THEN
      v_current_streak := 0;
    END IF;
  END IF;

  -- ============================================
  -- STEP 3: Update stats with proper streak values
  -- ============================================

  IF NEW.solved THEN
    -- Determine which attempt column to increment
    v_attempt_column := 'solved_in_' || NEW.attempts_used::TEXT;

    -- Update stats with dynamic column and streak
    EXECUTE format('
      UPDATE word_hunt_player_stats
      SET
        total_played = total_played + 1,
        total_solved = total_solved + 1,
        %I = %I + 1,
        current_streak = $1,
        longest_streak = $2,
        last_played_date = $3,
        updated_at = NOW()
      WHERE id = $4
    ', v_attempt_column, v_attempt_column)
    USING v_current_streak, v_longest_streak, v_today, v_stats_id;
  ELSE
    -- Failed to solve - update without incrementing solved count
    UPDATE word_hunt_player_stats
    SET
      total_played = total_played + 1,
      current_streak = v_current_streak,
      -- Don't reset longest_streak on failure
      last_played_date = v_today,
      updated_at = NOW()
    WHERE id = v_stats_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the fix
COMMENT ON FUNCTION update_word_hunt_player_stats() IS
    'Updates Word Hunt player statistics after each attempt. Now properly calculates streaks based on consecutive play days. Streaks only increment for solved puzzles; failed attempts reset the streak.';
