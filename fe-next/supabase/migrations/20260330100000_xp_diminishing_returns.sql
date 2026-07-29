-- =============================================
-- XP DIMINISHING RETURNS & DAILY CAP
-- Migration: 20260330100000_xp_diminishing_returns
-- Adds: daily_xp_earned, daily_xp_date columns
-- Updates: increment_player_xp to apply level-based
--          diminishing returns and daily XP cap
-- =============================================

-- =============================================
-- 1. ADD DAILY XP TRACKING COLUMNS
-- =============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_xp_earned INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_xp_date DATE DEFAULT CURRENT_DATE;

COMMENT ON COLUMN profiles.daily_xp_earned IS 'XP earned today (resets when daily_xp_date != current date)';
COMMENT ON COLUMN profiles.daily_xp_date IS 'Date of last XP earn, used for daily cap reset';

-- =============================================
-- 2. UPDATED increment_player_xp WITH DIMINISHING RETURNS
-- Applies:
--   a) Level-based diminishing returns (85%/70%/55% at higher levels)
--   b) Daily XP cap with tiered decay (100%/50%/25%)
--   c) Prestige multiplier (existing)
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
  v_current_level INTEGER;
  v_daily_earned INTEGER;
  v_daily_date DATE;
  v_dim_factor NUMERIC(4,2);
  v_after_dim INTEGER;
  v_effective_xp INTEGER;
  v_remaining INTEGER;
  v_cursor INTEGER;
  v_in_zone INTEGER;
  v_new_total BIGINT;
  v_new_lifetime BIGINT;
  v_new_level INTEGER;
  v_exponent NUMERIC;
  v_xp_needed BIGINT;
  -- Daily cap thresholds
  v_full_rate CONSTANT INTEGER := 1500;
  v_half_rate CONSTANT INTEGER := 3000;
BEGIN
  -- Fetch current profile state
  SELECT COALESCE(p.prestige_multiplier, 1.00),
         COALESCE(p.current_level, 1),
         COALESCE(p.daily_xp_earned, 0),
         COALESCE(p.daily_xp_date, CURRENT_DATE)
  INTO v_multiplier, v_current_level, v_daily_earned, v_daily_date
  FROM profiles p
  WHERE p.id = p_player_id;

  -- Reset daily counter if new day
  IF v_daily_date < CURRENT_DATE THEN
    v_daily_earned := 0;
    v_daily_date := CURRENT_DATE;
  END IF;

  -- Step 1: Apply prestige multiplier
  v_after_dim := ROUND(p_xp_amount * v_multiplier);

  -- Step 2: Apply level-based diminishing returns
  IF v_current_level <= 25 THEN
    v_dim_factor := 1.00;
  ELSIF v_current_level <= 50 THEN
    v_dim_factor := 0.85;
  ELSIF v_current_level <= 75 THEN
    v_dim_factor := 0.70;
  ELSE
    v_dim_factor := 0.55;
  END IF;
  v_after_dim := ROUND(v_after_dim * v_dim_factor);

  -- Step 3: Apply daily XP cap with tiered decay
  v_effective_xp := 0;
  v_remaining := v_after_dim;
  v_cursor := v_daily_earned;

  -- Zone 1: Full rate (0 - 1500)
  IF v_cursor < v_full_rate AND v_remaining > 0 THEN
    v_in_zone := LEAST(v_remaining, v_full_rate - v_cursor);
    v_effective_xp := v_effective_xp + v_in_zone;
    v_remaining := v_remaining - v_in_zone;
    v_cursor := v_cursor + v_in_zone;
  END IF;

  -- Zone 2: Half rate (1500 - 3000)
  IF v_cursor < v_half_rate AND v_remaining > 0 THEN
    v_in_zone := LEAST(v_remaining, v_half_rate - v_cursor);
    v_effective_xp := v_effective_xp + ROUND(v_in_zone * 0.5);
    v_remaining := v_remaining - v_in_zone;
    v_cursor := v_cursor + v_in_zone;
  END IF;

  -- Zone 3: Quarter rate (3000+)
  IF v_remaining > 0 THEN
    v_effective_xp := v_effective_xp + ROUND(v_remaining * 0.25);
  END IF;

  -- Ensure at least 1 XP is granted for positive input
  IF p_xp_amount > 0 AND v_effective_xp < 1 THEN
    v_effective_xp := 1;
  END IF;

  -- Update XP + daily tracking
  UPDATE profiles
  SET total_xp = COALESCE(total_xp, 0) + v_effective_xp,
      lifetime_xp = COALESCE(lifetime_xp, 0) + v_effective_xp,
      daily_xp_earned = v_daily_earned + v_after_dim,
      daily_xp_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE id = p_player_id
  RETURNING profiles.total_xp, profiles.lifetime_xp
  INTO v_new_total, v_new_lifetime;

  -- Calculate new level from XP using segmented curve
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

  RETURN QUERY SELECT v_new_total, v_new_lifetime, v_new_level, v_effective_xp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
