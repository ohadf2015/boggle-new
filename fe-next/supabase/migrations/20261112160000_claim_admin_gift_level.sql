-- Gift XP raised total_xp but never current_level, so a gift that crossed a
-- level left the player on the old level until their next game. Gifts skip the
-- prestige multiplier, diminishing returns and the daily cap on purpose; the
-- level uses the same curve as increment_player_xp (pinned by levelCurve.guard).

CREATE OR REPLACE FUNCTION public.claim_admin_gift(gift_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gift_record RECORD;
  badge_awarded BOOLEAN := FALSE;
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_new_total BIGINT;
  v_exponent NUMERIC;
  v_xp_needed BIGINT;
BEGIN
  SELECT * INTO gift_record
  FROM public.admin_gift_messages
  WHERE id = gift_id AND recipient_id = auth.uid() AND NOT claimed
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Gift not found, already claimed, or not yours'
    );
  END IF;

  UPDATE public.admin_gift_messages
  SET claimed = true, claimed_at = NOW(), updated_at = NOW()
  WHERE id = gift_id;

  SELECT COALESCE(p.current_level, 1), COALESCE(p.total_xp, 0)
  INTO v_old_level, v_new_total
  FROM public.profiles p
  WHERE p.id = gift_record.recipient_id
  FOR UPDATE;

  IF gift_record.xp_amount > 0 THEN
    UPDATE public.profiles
    SET total_xp = COALESCE(total_xp, 0) + gift_record.xp_amount,
        updated_at = NOW()
    WHERE id = gift_record.recipient_id
    RETURNING profiles.total_xp INTO v_new_total;
  END IF;

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

  IF gift_record.xp_amount > 0 THEN
    UPDATE public.profiles
    SET current_level = v_new_level
    WHERE id = gift_record.recipient_id
      AND current_level IS DISTINCT FROM v_new_level;
  END IF;

  IF gift_record.coin_amount > 0 THEN
    UPDATE public.profiles
    SET total_coins = COALESCE(total_coins, 0) + gift_record.coin_amount,
        lifetime_coins_earned = COALESCE(lifetime_coins_earned, 0) + gift_record.coin_amount,
        updated_at = NOW()
    WHERE id = gift_record.recipient_id;
  END IF;

  IF gift_record.badge_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.player_collectibles
      WHERE player_id = gift_record.recipient_id
      AND collectible_id = gift_record.badge_id
    ) THEN
      INSERT INTO public.player_collectibles (player_id, collectible_id, acquired_at, is_equipped)
      VALUES (gift_record.recipient_id, gift_record.badge_id, NOW(), false);
      badge_awarded := TRUE;
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'xp_awarded', gift_record.xp_amount,
    'coins_awarded', gift_record.coin_amount,
    'badge_id', gift_record.badge_id,
    'badge_awarded', badge_awarded,
    'new_total_xp', v_new_total,
    'old_level', v_old_level,
    'new_level', CASE WHEN gift_record.xp_amount > 0 THEN v_new_level ELSE v_old_level END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_admin_gift(uuid) TO authenticated;
