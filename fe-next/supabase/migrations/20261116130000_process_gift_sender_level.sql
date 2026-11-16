-- The XP a sender earns for gifting raised total_xp but never current_level, so a gift that crossed a
-- level left them on the old one until their next game (same gap claim_admin_gift had; same curve as
-- increment_player_xp, pinned by levelCurve.guard).
CREATE OR REPLACE FUNCTION public.process_gift(
  p_sender_id uuid,
  p_recipient_id uuid,
  p_gift_type text,
  p_amount integer,
  p_cost integer,
  p_xp integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_total BIGINT;
  v_new_level INTEGER;
  v_exponent NUMERIC;
  v_xp_needed BIGINT;
BEGIN
  IF (SELECT total_coins FROM profiles WHERE id = p_sender_id) < p_cost THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  IF (
    SELECT COUNT(*) FROM gift_history
    WHERE sender_id = p_sender_id
    AND created_at >= date_trunc('day', now())
  ) >= 3 THEN
    RAISE EXCEPTION 'Daily gift limit reached';
  END IF;

  UPDATE profiles
  SET total_coins = total_coins - p_cost
  WHERE id = p_sender_id AND total_coins >= p_cost;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to deduct coins from sender';
  END IF;

  IF p_gift_type = 'coins' THEN
    UPDATE profiles SET total_coins = total_coins + p_cost WHERE id = p_recipient_id;
  ELSIF p_gift_type = 'hints' THEN
    UPDATE profiles SET free_hints_available = free_hints_available + p_amount WHERE id = p_recipient_id;
  ELSIF p_gift_type = 'streak_freeze' THEN
    UPDATE profiles SET streak_freeze_count = streak_freeze_count + p_amount WHERE id = p_recipient_id;
  END IF;

  UPDATE profiles
  SET total_xp = total_xp + p_xp,
      lifetime_xp = lifetime_xp + p_xp
  WHERE id = p_sender_id
  RETURNING total_xp INTO v_new_total;

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
  WHERE id = p_sender_id AND current_level IS DISTINCT FROM v_new_level;

  INSERT INTO gift_history (sender_id, recipient_id, gift_type, amount, cost, xp_awarded)
  VALUES (p_sender_id, p_recipient_id, p_gift_type, p_amount, p_cost, p_xp);
END;
$$;
