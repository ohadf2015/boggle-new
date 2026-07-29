-- Add re-engagement email tracking column to profiles
-- Used to enforce 14-day anti-spam interval between re-engagement emails

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_reengagement_email_sent_at TIMESTAMPTZ;

-- Index for efficient filtering of eligible recipients
CREATE INDEX IF NOT EXISTS idx_profiles_reengagement_email
ON profiles(daily_email_subscribed, last_reengagement_email_sent_at)
WHERE daily_email_subscribed = true;

COMMENT ON COLUMN profiles.last_reengagement_email_sent_at
IS 'Timestamp of last re-engagement email sent. Used for 14-day anti-spam interval.';
