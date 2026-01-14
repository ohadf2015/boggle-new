-- Migration: Buzz Challenge Requests
-- Description: Table for storing user requests for Daily Buzz challenges
-- in languages that don't have challenges available yet.

-- Create buzz_challenge_requests table
CREATE TABLE IF NOT EXISTS buzz_challenge_requests (
  id BIGSERIAL PRIMARY KEY,
  language VARCHAR(5) NOT NULL,
  player_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_fingerprint TEXT,
  reason TEXT,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  -- Ensure either player_id or guest_fingerprint is provided
  CONSTRAINT chk_requester CHECK (
    player_id IS NOT NULL OR guest_fingerprint IS NOT NULL
  )
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_buzz_requests_language_date
  ON buzz_challenge_requests(language, request_date);

CREATE INDEX IF NOT EXISTS idx_buzz_requests_player
  ON buzz_challenge_requests(player_id)
  WHERE player_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_buzz_requests_status
  ON buzz_challenge_requests(status, request_date);

-- Enable RLS
ALTER TABLE buzz_challenge_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert requests (rate limiting handled at API level)
CREATE POLICY "Anyone can request challenges"
  ON buzz_challenge_requests
  FOR INSERT
  WITH CHECK (true);

-- Users can view their own requests
CREATE POLICY "Users can view own requests"
  ON buzz_challenge_requests
  FOR SELECT
  USING (
    player_id = auth.uid() OR
    guest_fingerprint IS NOT NULL
  );

-- Admins can view and update all requests
CREATE POLICY "Admins can manage all requests"
  ON buzz_challenge_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Add comment for documentation
COMMENT ON TABLE buzz_challenge_requests IS
  'Stores user requests for Daily Buzz challenges in languages without available challenges';
