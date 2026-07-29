-- Add badge support to admin gift messages
-- Allows admins to attach a unique rare badge when sending gifts to players

-- Add badge_id column to admin_gift_messages
ALTER TABLE admin_gift_messages
ADD COLUMN IF NOT EXISTS badge_id TEXT REFERENCES collectible_items(id) ON DELETE SET NULL;

-- Add index for badge lookups
CREATE INDEX IF NOT EXISTS idx_gift_messages_badge ON admin_gift_messages(badge_id) WHERE badge_id IS NOT NULL;

-- Update claim_admin_gift function to award badge
CREATE OR REPLACE FUNCTION claim_admin_gift(gift_id UUID)
RETURNS JSON AS $$
DECLARE
  gift_record RECORD;
  result JSON;
  badge_awarded BOOLEAN := FALSE;
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

  -- Award badge if attached
  IF gift_record.badge_id IS NOT NULL THEN
    -- Check if player already has this badge
    IF NOT EXISTS (
      SELECT 1 FROM player_collectibles
      WHERE player_id = gift_record.recipient_id
      AND collectible_id = gift_record.badge_id
    ) THEN
      -- Insert the badge into player's collection
      INSERT INTO player_collectibles (player_id, collectible_id, acquired_at, is_equipped)
      VALUES (gift_record.recipient_id, gift_record.badge_id, NOW(), false);
      badge_awarded := TRUE;
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'xp_awarded', gift_record.xp_amount,
    'coins_awarded', gift_record.coin_amount,
    'badge_id', gift_record.badge_id,
    'badge_awarded', badge_awarded
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (in case it was removed)
GRANT EXECUTE ON FUNCTION claim_admin_gift(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON COLUMN admin_gift_messages.badge_id IS 'Optional badge to award to player when gift is claimed';
