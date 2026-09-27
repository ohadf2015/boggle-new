-- Track last time daily-challenge push reminder was sent (dedupe across cron tick)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_daily_push_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_last_daily_push_sent_at
  ON profiles(last_daily_push_sent_at);

COMMENT ON COLUMN profiles.last_daily_push_sent_at
  IS 'Timestamp of last daily-challenge push reminder; used to dedupe cron fan-out';
