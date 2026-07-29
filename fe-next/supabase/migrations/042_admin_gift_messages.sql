-- Admin Gift Messages Table
-- Stores personalized gift messages from admins to players with XP/coin rewards

CREATE TABLE IF NOT EXISTS admin_gift_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,

  -- Content
  title VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  template_type VARCHAR(50) CHECK (template_type IN ('top_player', 'feedback_request', 'thank_you', 'custom')),
  image_url TEXT,

  -- Rewards
  xp_amount INTEGER DEFAULT 0 CHECK (xp_amount >= 0 AND xp_amount <= 10000),
  coin_amount INTEGER DEFAULT 0 CHECK (coin_amount >= 0 AND coin_amount <= 10000),

  -- Status
  claimed BOOLEAN DEFAULT FALSE,
  claimed_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_gift_messages_recipient ON admin_gift_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_gift_messages_unclaimed ON admin_gift_messages(recipient_id) WHERE NOT claimed;
CREATE INDEX IF NOT EXISTS idx_gift_messages_created ON admin_gift_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gift_messages_sender ON admin_gift_messages(sender_id);

-- Enable RLS
ALTER TABLE admin_gift_messages ENABLE ROW LEVEL SECURITY;

-- Admins can do everything (insert, select, update, delete)
CREATE POLICY "Admins have full access to gift messages" ON admin_gift_messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Players can view their own gifts
CREATE POLICY "Players can view their own gifts" ON admin_gift_messages
  FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

-- Players can claim (update) their own unclaimed gifts
CREATE POLICY "Players can claim their own unclaimed gifts" ON admin_gift_messages
  FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid() AND NOT claimed)
  WITH CHECK (recipient_id = auth.uid() AND claimed = true);

-- Function to claim a gift and award XP/coins atomically
CREATE OR REPLACE FUNCTION claim_admin_gift(gift_id UUID)
RETURNS JSON AS $$
DECLARE
  gift_record RECORD;
  result JSON;
BEGIN
  -- Lock the gift record for update
  SELECT * INTO gift_record
  FROM admin_gift_messages
  WHERE id = gift_id AND recipient_id = auth.uid() AND NOT claimed
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Gift not found, already claimed, or not yours'
    );
  END IF;

  -- Mark as claimed
  UPDATE admin_gift_messages
  SET claimed = true, claimed_at = NOW(), updated_at = NOW()
  WHERE id = gift_id;

  -- Award XP
  IF gift_record.xp_amount > 0 THEN
    UPDATE profiles
    SET total_xp = COALESCE(total_xp, 0) + gift_record.xp_amount,
        updated_at = NOW()
    WHERE id = gift_record.recipient_id;
  END IF;

  -- Award coins
  IF gift_record.coin_amount > 0 THEN
    UPDATE profiles
    SET total_coins = COALESCE(total_coins, 0) + gift_record.coin_amount,
        lifetime_coins_earned = COALESCE(lifetime_coins_earned, 0) + gift_record.coin_amount,
        updated_at = NOW()
    WHERE id = gift_record.recipient_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'xp_awarded', gift_record.xp_amount,
    'coins_awarded', gift_record.coin_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION claim_admin_gift(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE admin_gift_messages IS 'Admin gift messages with XP/coin rewards for players';
COMMENT ON FUNCTION claim_admin_gift(UUID) IS 'Atomically claims a gift and awards XP/coins to the player';
