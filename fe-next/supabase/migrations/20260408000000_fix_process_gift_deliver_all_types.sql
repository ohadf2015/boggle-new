-- Add timer_seconds column to friend_challenges
ALTER TABLE friend_challenges ADD COLUMN IF NOT EXISTS timer_seconds integer;

-- Fix process_gift to actually deliver hints and streak freezes to recipients
CREATE OR REPLACE FUNCTION process_gift(
  p_sender_id uuid,
  p_recipient_id uuid,
  p_gift_type text,
  p_amount integer,
  p_cost integer,
  p_xp integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

  -- Deduct cost from sender
  UPDATE profiles
  SET total_coins = total_coins - p_cost
  WHERE id = p_sender_id AND total_coins >= p_cost;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to deduct coins from sender';
  END IF;

  -- Credit recipient based on gift type
  IF p_gift_type = 'coins' THEN
    UPDATE profiles
    SET total_coins = total_coins + p_cost
    WHERE id = p_recipient_id;
  ELSIF p_gift_type = 'hints' THEN
    UPDATE profiles
    SET free_hints_available = free_hints_available + p_amount
    WHERE id = p_recipient_id;
  ELSIF p_gift_type = 'streak_freeze' THEN
    UPDATE profiles
    SET streak_freeze_count = streak_freeze_count + p_amount
    WHERE id = p_recipient_id;
  END IF;

  -- Award XP to sender for generosity
  UPDATE profiles
  SET total_xp = total_xp + p_xp,
      lifetime_xp = lifetime_xp + p_xp
  WHERE id = p_sender_id;

  -- Record in history
  INSERT INTO gift_history (sender_id, recipient_id, gift_type, amount, cost, xp_awarded)
  VALUES (p_sender_id, p_recipient_id, p_gift_type, p_amount, p_cost, p_xp);
END;
$$;
