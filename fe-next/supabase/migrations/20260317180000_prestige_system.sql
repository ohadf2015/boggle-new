-- =============================================
-- PRESTIGE SYSTEM DATABASE SUPPORT
-- Migration: 20260317180000_prestige_system
-- Adds: prestige columns, lifetime_xp, player_title,
--        increment_player_xp RPC with prestige multiplier,
--        optimistic-lock-safe prestige RPC
-- =============================================

-- =============================================
-- 1. ADD PRESTIGE COLUMNS TO PROFILES
-- =============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS prestige_level INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS prestige_multiplier NUMERIC(4,2) DEFAULT 1.00;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS prestige_unlocks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lifetime_xp BIGINT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS player_title TEXT;

-- Indexes for prestige queries
CREATE INDEX IF NOT EXISTS idx_profiles_prestige_level ON profiles(prestige_level DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_lifetime_xp ON profiles(lifetime_xp DESC);

-- =============================================
-- 2. BACKFILL lifetime_xp FROM total_xp
-- For existing players who have never prestiged
-- =============================================
UPDATE profiles
SET lifetime_xp = COALESCE(total_xp, 0)
WHERE lifetime_xp IS NULL OR lifetime_xp = 0;

-- =============================================
-- 3. INCREMENT PLAYER XP (with prestige multiplier)
-- Called by engagement, calendar, daily challenges, etc.
-- Applies prestige_multiplier automatically.
-- =============================================
CREATE OR REPLACE FUNCTION increment_player_xp(
  p_player_id UUID,
  p_xp_amount INTEGER
)
RETURNS TABLE(
  new_total_xp BIGINT,
  new_lifetime_xp BIGINT,
  new_level INTEGER,
  xp_granted INTEGER
) AS $$
DECLARE
  v_multiplier NUMERIC(4,2);
  v_actual_xp INTEGER;
  v_new_total BIGINT;
  v_new_lifetime BIGINT;
  v_new_level INTEGER;
  v_exponent NUMERIC;
  v_xp_needed BIGINT;
BEGIN
  -- Get prestige multiplier
  SELECT COALESCE(p.prestige_multiplier, 1.00)
  INTO v_multiplier
  FROM profiles p
  WHERE p.id = p_player_id;

  -- Apply multiplier
  v_actual_xp := ROUND(p_xp_amount * v_multiplier);

  -- Update XP (both total and lifetime)
  UPDATE profiles
  SET total_xp = COALESCE(total_xp, 0) + v_actual_xp,
      lifetime_xp = COALESCE(lifetime_xp, 0) + v_actual_xp,
      updated_at = NOW()
  WHERE id = p_player_id
  RETURNING profiles.total_xp, profiles.lifetime_xp
  INTO v_new_total, v_new_lifetime;

  -- Calculate new level from XP using segmented curve
  -- Matches xpManager.ts getXpForLevel() exactly
  v_new_level := 1;
  FOR i IN REVERSE 100..2 LOOP
    IF i <= 25 THEN v_exponent := 1.4;
    ELSIF i <= 50 THEN v_exponent := 1.45;
    ELSIF i <= 75 THEN v_exponent := 1.5;
    ELSE v_exponent := 1.55;
    END IF;

    v_xp_needed := ROUND(100 * POWER(i, v_exponent));
    IF v_new_total >= v_xp_needed THEN
      v_new_level := i;
      EXIT;
    END IF;
  END LOOP;

  -- Update level
  UPDATE profiles
  SET current_level = v_new_level
  WHERE id = p_player_id
    AND current_level IS DISTINCT FROM v_new_level;

  RETURN QUERY SELECT v_new_total, v_new_lifetime, v_new_level, v_actual_xp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Alias used by referral system
CREATE OR REPLACE FUNCTION increment_profile_xp(
  p_player_id UUID,
  p_xp_amount INTEGER
)
RETURNS TABLE(
  new_total_xp BIGINT,
  new_lifetime_xp BIGINT,
  new_level INTEGER,
  xp_granted INTEGER
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM increment_player_xp(p_player_id, p_xp_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- =============================================
-- 4. APPLY PRESTIGE (atomic, race-condition safe)
-- Returns the new state or NULL if lock failed
-- =============================================
CREATE OR REPLACE FUNCTION apply_prestige(
  p_player_id UUID,
  p_expected_prestige INTEGER
)
RETURNS TABLE(
  new_prestige_level INTEGER,
  new_multiplier NUMERIC(4,2),
  new_title TEXT,
  rows_affected INTEGER
) AS $$
DECLARE
  v_new_prestige INTEGER;
  v_new_multiplier NUMERIC(4,2);
  v_new_title TEXT;
  v_rows INTEGER;
  v_multipliers NUMERIC(4,2)[] := ARRAY[1.00, 1.05, 1.10, 1.15, 1.20, 1.25];
  v_titles TEXT[] := ARRAY[NULL, 'ASCENDED_ONE', 'TWICE_RISEN', 'THRICE_BLESSED', 'ETERNAL_WARRIOR', 'LEXICON_IMMORTAL'];
BEGIN
  v_new_prestige := p_expected_prestige + 1;

  IF v_new_prestige > 5 THEN
    RETURN QUERY SELECT 0, 1.00::NUMERIC(4,2), NULL::TEXT, 0;
    RETURN;
  END IF;

  v_new_multiplier := v_multipliers[v_new_prestige + 1]; -- 1-indexed
  v_new_title := v_titles[v_new_prestige + 1];

  -- Atomic update with optimistic lock on prestige_level
  UPDATE profiles
  SET current_level = 1,
      total_xp = 0,
      -- lifetime_xp is NOT modified here — increment_player_xp already tracks it cumulatively
      prestige_level = v_new_prestige,
      prestige_multiplier = v_new_multiplier,
      player_title = v_new_title,
      updated_at = NOW()
  WHERE id = p_player_id
    AND COALESCE(prestige_level, 0) = p_expected_prestige
    AND COALESCE(current_level, 1) >= 100;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  RETURN QUERY SELECT v_new_prestige, v_new_multiplier, v_new_title, v_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- =============================================
-- 5. COMMENTS
-- =============================================
COMMENT ON COLUMN profiles.prestige_level IS 'Current prestige tier (0-5). Resets level to 1 each time.';
COMMENT ON COLUMN profiles.prestige_multiplier IS 'XP multiplier from prestige (1.00-1.25). Applied by increment_player_xp.';
COMMENT ON COLUMN profiles.prestige_unlocks IS 'JSONB array of unlocked prestige rewards with timestamps.';
COMMENT ON COLUMN profiles.lifetime_xp IS 'Total XP earned across all prestige resets. Never decreases.';
COMMENT ON COLUMN profiles.player_title IS 'Current player title (from prestige or level milestones).';
