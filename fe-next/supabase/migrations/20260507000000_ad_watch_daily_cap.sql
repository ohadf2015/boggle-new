-- =============================================
-- Server-side daily ad-watch cap
-- Adds daily_ad_watch_count + daily_ad_watch_date to profiles,
-- and a new award_ad_coins() RPC that atomically enforces the
-- 10-watch/day limit and grants coins in one round-trip.
--
-- WHY: The previous client-only cap (localStorage) was bypassable
-- by clearing storage or hitting /api/coins directly. WATCH_AD = 250
-- coins per watch — a direct POST loop could farm unlimited coins.
-- =============================================

-- 1. Add tracking columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_ad_watch_count  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_ad_watch_date   DATE;

-- 2. Atomic RPC: check limit → increment → grant coins → return balance
CREATE OR REPLACE FUNCTION public.award_ad_coins(
  p_user_id   UUID,
  p_amount    INTEGER,
  p_reason    TEXT     DEFAULT 'Watched Ad',
  p_metadata  JSONB    DEFAULT '{}'::jsonb,
  p_max_daily INTEGER  DEFAULT 10
)
RETURNS TABLE(
  success       BOOLEAN,
  new_balance   INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_current_balance   INTEGER;
  v_new_balance       INTEGER;
  v_watch_count       INTEGER;
  v_watch_date        DATE;
  v_today             DATE := CURRENT_DATE;
BEGIN
  -- Lock the row for the entire operation (prevents concurrent double-grants)
  SELECT COALESCE(total_coins, 0),
         COALESCE(daily_ad_watch_count, 0),
         daily_ad_watch_date
  INTO v_current_balance, v_watch_count, v_watch_date
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'Profile not found'::TEXT;
    RETURN;
  END IF;

  -- Reset counter when date rolls over
  IF v_watch_date IS NULL OR v_watch_date < v_today THEN
    v_watch_count := 0;
  END IF;

  -- Enforce daily cap
  IF v_watch_count >= p_max_daily THEN
    RETURN QUERY SELECT FALSE, v_current_balance, 'Daily ad limit reached'::TEXT;
    RETURN;
  END IF;

  IF p_amount <= 0 THEN
    RETURN QUERY SELECT FALSE, v_current_balance, 'Amount must be positive'::TEXT;
    RETURN;
  END IF;

  v_new_balance := v_current_balance + p_amount;

  UPDATE public.profiles
  SET total_coins              = v_new_balance,
      lifetime_coins_earned   = COALESCE(lifetime_coins_earned, 0) + p_amount,
      daily_ad_watch_count    = v_watch_count + 1,
      daily_ad_watch_date     = v_today,
      updated_at              = NOW()
  WHERE id = p_user_id;

  RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.award_ad_coins(UUID, INTEGER, TEXT, JSONB, INTEGER) IS
  'Atomically enforce daily ad-watch cap and grant coins. '
  'Resets counter at midnight (server date). Returns new balance.';
