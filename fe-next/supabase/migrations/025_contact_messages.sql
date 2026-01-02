-- Contact Messages Table
-- Stores messages from the contact form

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by status and date
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);

-- RLS Policy: Only service role can access (admin only)
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- No public access - only accessible via service role key
CREATE POLICY "Service role access only" ON contact_messages
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Add comment for documentation
COMMENT ON TABLE contact_messages IS 'Stores contact form submissions from users';
