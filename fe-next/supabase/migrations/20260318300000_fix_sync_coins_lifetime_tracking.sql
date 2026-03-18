-- =============================================
-- FIX: sync_coins was not updating lifetime_coins_earned
-- When coins are earned (positive amount), lifetime_coins_earned
-- should be incremented so the profile stats are accurate.
-- =============================================

CREATE OR REPLACE FUNCTION sync_coins(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  success BOOLEAN,
  new_balance INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get current balance with row lock
  SELECT COALESCE(total_coins, 0)
  INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'Profile not found'::TEXT;
    RETURN;
  END IF;

  v_new_balance := v_current_balance + p_amount;

  -- Prevent negative balance on spend
  IF v_new_balance < 0 THEN
    RETURN QUERY SELECT FALSE, v_current_balance, 'Insufficient coins'::TEXT;
    RETURN;
  END IF;

  -- Update balance and lifetime tracking
  IF p_amount > 0 THEN
    -- Earning coins: update both balance and lifetime counter
    UPDATE profiles
    SET total_coins = v_new_balance,
        lifetime_coins_earned = COALESCE(lifetime_coins_earned, 0) + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
    -- Spending coins: only update balance
    UPDATE profiles
    SET total_coins = v_new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION sync_coins(UUID, INTEGER, TEXT, JSONB) IS
  'Atomically update coin balance. Positive = earn (tracks lifetime), negative = spend. Returns new balance.';
