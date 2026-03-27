-- Migration: Fix corrupted adventure progression data and add constraints
-- Root cause: .single() on optimistic-lock update converted 0-row results into
-- PGRST116 errors, causing player_progression updates to fail silently while
-- level_completions were already saved. This left current_world/current_level
-- and total_stars out of sync with actual completions.

-- Step 1: Recalculate current_world and current_level from level_completions
-- The "frontier" is one level past the highest completed level (with >= 1 star)
WITH player_frontier AS (
  SELECT
    lc.user_id,
    MAX(lc.world * 100 + lc.level) AS max_key
  FROM level_completions lc
  WHERE lc.stars >= 1
  GROUP BY lc.user_id
),
correct_frontier AS (
  SELECT
    pf.user_id,
    CASE
      WHEN (pf.max_key % 100) >= 7 THEN LEAST((pf.max_key / 100) + 1, 10)
      ELSE (pf.max_key / 100)
    END AS correct_world,
    CASE
      WHEN (pf.max_key % 100) >= 7 THEN
        CASE WHEN (pf.max_key / 100) >= 10 THEN 7 ELSE 1 END
      ELSE (pf.max_key % 100) + 1
    END AS correct_level
  FROM player_frontier pf
)
UPDATE player_progression pp
SET
  current_world = cf.correct_world,
  current_level = cf.correct_level,
  updated_at = NOW()
FROM correct_frontier cf
WHERE pp.user_id = cf.user_id
  AND (pp.current_world != cf.correct_world OR pp.current_level != cf.correct_level);

-- Step 2: Recalculate total_stars from actual level_completions
WITH star_totals AS (
  SELECT user_id, COALESCE(SUM(stars), 0)::int AS actual_stars
  FROM level_completions
  GROUP BY user_id
)
UPDATE player_progression pp
SET
  total_stars = st.actual_stars,
  updated_at = NOW()
FROM star_totals st
WHERE pp.user_id = st.user_id
  AND pp.total_stars != st.actual_stars;

-- Step 3: Add CHECK constraints to prevent invalid values in the future
-- current_level must be 1-7 (LEVELS_PER_WORLD = 7)
ALTER TABLE player_progression
  ADD CONSTRAINT chk_current_level_range CHECK (current_level >= 1 AND current_level <= 7);

-- current_world must be 1-10 (WORLDS_COUNT = 10)
ALTER TABLE player_progression
  ADD CONSTRAINT chk_current_world_range CHECK (current_world >= 1 AND current_world <= 10);

-- total_stars must be non-negative
ALTER TABLE player_progression
  ADD CONSTRAINT chk_total_stars_non_negative CHECK (total_stars >= 0);

-- gold must be non-negative
ALTER TABLE player_progression
  ADD CONSTRAINT chk_gold_non_negative CHECK (gold >= 0);
