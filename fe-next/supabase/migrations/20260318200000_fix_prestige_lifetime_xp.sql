-- =============================================
-- FIX: apply_prestige was double-counting lifetime_xp
-- increment_player_xp already adds to lifetime_xp on every XP gain,
-- so apply_prestige should NOT add total_xp to lifetime_xp again.
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
  -- lifetime_xp is NOT modified — increment_player_xp already tracks it cumulatively
  UPDATE profiles
  SET current_level = 1,
      total_xp = 0,
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
