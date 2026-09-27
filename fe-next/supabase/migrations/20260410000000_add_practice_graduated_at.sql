-- Practice graduation tracking
-- Marks the first moment a player crossed the 20-total-words threshold.
-- Used to hide practice / single-player affordances for "veteran" players
-- and emphasize them for newcomers.
--
-- This is a nullable TIMESTAMPTZ: NULL means "still a newcomer",
-- any timestamp means "graduated at that moment". We never clear it.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS practice_graduated_at TIMESTAMPTZ DEFAULT NULL;

-- Extend the atomic stats+XP RPC to accept practice_graduated_at through
-- its JSONB whitelist so we keep the single-lock write path (avoiding the
-- deadlock regressions that motivated the original atomic RPC).
CREATE OR REPLACE FUNCTION update_player_stats_and_xp(
  p_player_id UUID,
  p_stats JSONB,
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
  v_key TEXT;
  v_update_sql TEXT;
  v_set_parts TEXT[];
BEGIN
  SELECT COALESCE(p.prestige_multiplier, 1.00)
  INTO v_multiplier
  FROM profiles p
  WHERE p.id = p_player_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_set_parts := ARRAY['updated_at = NOW()'];

  FOR v_key IN SELECT * FROM jsonb_object_keys(p_stats) LOOP
    CASE v_key
      WHEN 'total_games', 'total_score', 'total_words', 'total_time_played',
           'ranked_games', 'casual_games', 'ranked_wins', 'casual_wins',
           'unique_days_played' THEN
        v_set_parts := v_set_parts || format('%I = %s', v_key, (p_stats->>v_key)::TEXT);
      WHEN 'longest_word' THEN
        v_set_parts := v_set_parts || format('longest_word = %L', p_stats->>'longest_word');
      WHEN 'longest_word_length' THEN
        v_set_parts := v_set_parts || format('longest_word_length = %s', (p_stats->>'longest_word_length')::TEXT);
      WHEN 'achievement_counts' THEN
        v_set_parts := v_set_parts || format('achievement_counts = %L::jsonb', (p_stats->'achievement_counts')::TEXT);
      WHEN 'last_game_at' THEN
        v_set_parts := v_set_parts || format('last_game_at = %L', p_stats->>'last_game_at');
      WHEN 'practice_graduated_at' THEN
        -- Only set when currently NULL — defensive guard against accidentally
        -- overwriting an earlier graduation timestamp.
        v_set_parts := v_set_parts || format(
          'practice_graduated_at = COALESCE(practice_graduated_at, %L::timestamptz)',
          p_stats->>'practice_graduated_at'
        );
      ELSE
        NULL;
    END CASE;
  END LOOP;

  v_update_sql := format(
    'UPDATE profiles SET %s WHERE id = %L',
    array_to_string(v_set_parts, ', '),
    p_player_id
  );
  EXECUTE v_update_sql;

  IF p_xp_amount > 0 THEN
    v_actual_xp := ROUND(p_xp_amount * v_multiplier);

    UPDATE profiles
    SET total_xp = COALESCE(total_xp, 0) + v_actual_xp,
        lifetime_xp = COALESCE(lifetime_xp, 0) + v_actual_xp
    WHERE id = p_player_id
    RETURNING profiles.total_xp, profiles.lifetime_xp
    INTO v_new_total, v_new_lifetime;

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

    UPDATE profiles
    SET current_level = v_new_level
    WHERE id = p_player_id
      AND current_level IS DISTINCT FROM v_new_level;
  ELSE
    v_actual_xp := 0;
    SELECT COALESCE(p.total_xp, 0), COALESCE(p.lifetime_xp, 0), COALESCE(p.current_level, 1)
    INTO v_new_total, v_new_lifetime, v_new_level
    FROM profiles p
    WHERE p.id = p_player_id;
  END IF;

  RETURN QUERY SELECT v_new_total, v_new_lifetime, v_new_level, v_actual_xp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Backfill existing "veteran" players so the UX switch is seamless on deploy.
-- Anyone who already has 20+ lifetime words is retroactively graduated.
-- We use last_game_at as the best-available "graduation moment" estimate,
-- falling back to NOW() for profiles without one.
UPDATE profiles
SET practice_graduated_at = COALESCE(last_game_at, NOW())
WHERE practice_graduated_at IS NULL
  AND COALESCE(total_words, 0) >= 20;
