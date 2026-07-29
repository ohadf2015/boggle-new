-- Boost picker (sabotage-replacement)
-- Spec: fe-next/docs/specs/2026-04-26-boost-picker-design.md

-- 1. Counter columns on profiles. Defaults handle existing rows; defensive
-- on-read reset uses last_boost_reset_date in case the daily cron skips.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS daily_boost_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_boost_reset_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- 2. Claim ledger. Unique (user_id, session_id) is the idempotency guard.
CREATE TABLE IF NOT EXISTS boost_claims (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  boost_type TEXT NOT NULL CHECK (boost_type IN ('freezeTime','hint','scoreMultiplier','firstWordBonus')),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT boost_claims_user_session_unique UNIQUE (user_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_boost_claims_user_claimed_at
  ON boost_claims (user_id, claimed_at DESC);

-- 3. RLS: server-only via service_role. No anon/authenticated access.
ALTER TABLE boost_claims ENABLE ROW LEVEL SECURITY;

-- 4. Atomic claim RPC. Cap = 5/day (constant; tune via re-migration).
CREATE OR REPLACE FUNCTION claim_boost(
  p_user_id UUID,
  p_session_id TEXT,
  p_boost_type TEXT
)
RETURNS TABLE(success BOOLEAN, remaining INTEGER, error_message TEXT)
AS $$
DECLARE
  v_cap CONSTANT INTEGER := 5;
  v_count INTEGER;
  v_last_reset DATE;
  v_today DATE := CURRENT_DATE;
BEGIN
  IF p_boost_type NOT IN ('freezeTime','hint','scoreMultiplier','firstWordBonus') THEN
    RETURN QUERY SELECT FALSE, 0, 'invalid_type'::TEXT;
    RETURN;
  END IF;

  IF p_session_id IS NULL OR length(p_session_id) = 0 OR length(p_session_id) > 128 THEN
    RETURN QUERY SELECT FALSE, 0, 'invalid_session'::TEXT;
    RETURN;
  END IF;

  SELECT daily_boost_count, last_boost_reset_date
  INTO v_count, v_last_reset
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'profile_not_found'::TEXT;
    RETURN;
  END IF;

  IF v_last_reset < v_today THEN
    v_count := 0;
    UPDATE profiles
    SET daily_boost_count = 0, last_boost_reset_date = v_today
    WHERE id = p_user_id;
  END IF;

  IF v_count >= v_cap THEN
    RETURN QUERY SELECT FALSE, 0, 'cap_reached'::TEXT;
    RETURN;
  END IF;

  BEGIN
    INSERT INTO boost_claims (user_id, session_id, boost_type)
    VALUES (p_user_id, p_session_id, p_boost_type);
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT FALSE, (v_cap - v_count), 'already_claimed'::TEXT;
    RETURN;
  END;

  UPDATE profiles
  SET daily_boost_count = v_count + 1
  WHERE id = p_user_id;

  RETURN QUERY SELECT TRUE, (v_cap - v_count - 1), NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION claim_boost(UUID, TEXT, TEXT) IS
  'Atomically claim a boost for a session. Enforces 5/day cap + (user_id, session_id) idempotency. Defensive on-read midnight reset if cron skipped.';

-- 5. Daily reset cron (UTC midnight). Defense-in-depth — function also resets on read.
DO $$
BEGIN
  PERFORM cron.unschedule('reset-daily-boost-counts')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset-daily-boost-counts');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'reset-daily-boost-counts',
  '0 0 * * *',
  $$ UPDATE profiles SET daily_boost_count = 0, last_boost_reset_date = CURRENT_DATE WHERE daily_boost_count > 0 OR last_boost_reset_date < CURRENT_DATE; $$
);
