-- Track last claim time for daily ad-rewarded avatar part drop (24h cooldown).
-- Null = never claimed (first-time eligible).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_daily_part_claim_at timestamptz NULL;

COMMENT ON COLUMN profiles.last_daily_part_claim_at IS
  'Last time user claimed the daily ad-rewarded premium avatar part. 24h cooldown enforced server-side.';
