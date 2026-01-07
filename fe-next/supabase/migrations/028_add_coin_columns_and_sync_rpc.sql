-- =============================================
-- ADD COIN COLUMNS + SYNC RPC
-- Migration: 028_add_coin_columns_and_sync_rpc
--
-- Adds:
--   - profiles.total_coins
--   - profiles.lifetime_coins_earned
--   - public.sync_coins RPC for atomic add/spend
-- =============================================

-- Columns used by frontend profile selectors + coin hooks
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_coins INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lifetime_coins_earned INTEGER NOT NULL DEFAULT 0;

-- Ensure existing rows are non-null
UPDATE profiles
SET
  total_coins = COALESCE(total_coins, 0),
  lifetime_coins_earned = COALESCE(lifetime_coins_earned, 0)
WHERE total_coins IS NULL OR lifetime_coins_earned IS NULL;

-- Atomic coin add/spend RPC
-- Frontend expects: data?.[0] with fields { success, new_balance, error_message }
CREATE OR REPLACE FUNCTION public.sync_coins(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  success BOOLEAN,
  new_balance INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
  updated_balance INTEGER;
BEGIN
  -- Enforce auth and user scope
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, 'Unauthorized';
    RETURN;
  END IF;

  IF p_amount = 0 THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, 'Amount must be non-zero';
    RETURN;
  END IF;

  -- Lock the profile row to avoid race conditions
  SELECT COALESCE(total_coins, 0)
  INTO current_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, 'Profile not found';
    RETURN;
  END IF;

  IF current_balance + p_amount < 0 THEN
    RETURN QUERY SELECT FALSE, current_balance, 'Insufficient coins';
    RETURN;
  END IF;

  UPDATE profiles
  SET
    total_coins = COALESCE(total_coins, 0) + p_amount,
    lifetime_coins_earned = COALESCE(lifetime_coins_earned, 0) + GREATEST(p_amount, 0)
  WHERE id = p_user_id
  RETURNING total_coins INTO updated_balance;

  RETURN QUERY SELECT TRUE, updated_balance, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_coins(UUID, INTEGER, TEXT, JSONB) TO authenticated;

COMMENT ON COLUMN profiles.total_coins IS 'Current spendable coin balance';
COMMENT ON COLUMN profiles.lifetime_coins_earned IS 'Lifetime coins earned (non-decreasing)';
COMMENT ON FUNCTION public.sync_coins(UUID, INTEGER, TEXT, JSONB) IS 'Atomic coin add/spend with insufficient-funds protection';
