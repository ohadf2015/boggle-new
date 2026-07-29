-- Lock sync_coins to the search-path-hardened body that's already live in DB.
-- Drifted from on-disk 20260318300000 after nightly search-path hardening.
-- Body fully schema-qualifies refs; safe under SET search_path = ''.

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
SET search_path = ''
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE public.profiles
  SET
    total_coins           = COALESCE(total_coins, 0) + p_amount,
    lifetime_coins_earned = CASE
                              WHEN p_amount > 0
                              THEN COALESCE(lifetime_coins_earned, 0) + p_amount
                              ELSE lifetime_coins_earned
                            END,
    updated_at            = NOW()
  WHERE id = p_user_id
    AND (COALESCE(total_coins, 0) + p_amount) >= 0
  RETURNING total_coins INTO v_new_balance;

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
    RETURN;
  END IF;

  SELECT COALESCE(total_coins, 0) INTO v_new_balance
  FROM public.profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'Profile not found'::TEXT;
  ELSE
    RETURN QUERY SELECT FALSE, v_new_balance, 'Insufficient coins'::TEXT;
  END IF;
END;
$$;
