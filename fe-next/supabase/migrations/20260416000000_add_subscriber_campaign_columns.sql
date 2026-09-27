-- Add campaign support columns to email_subscribers
-- Enables: unsubscribe tokens, anti-spam interval tracking for campaigns

ALTER TABLE email_subscribers
  ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT,
  ADD COLUMN IF NOT EXISTS last_campaign_email_sent_at TIMESTAMPTZ;

-- Index for unsubscribe token lookups (used by unsubscribeByToken)
CREATE INDEX IF NOT EXISTS idx_email_subscribers_unsubscribe_token
  ON email_subscribers (unsubscribe_token)
  WHERE unsubscribe_token IS NOT NULL;

-- Index for campaign recipient queries (active + anti-spam filter)
CREATE INDEX IF NOT EXISTS idx_email_subscribers_campaign_eligible
  ON email_subscribers (is_active, last_campaign_email_sent_at);
