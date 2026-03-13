-- Add custom avatar config (JSONB) to profiles and synced tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_config JSONB DEFAULT NULL;
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS avatar_config JSONB DEFAULT NULL;
ALTER TABLE daily_puzzle_attempts ADD COLUMN IF NOT EXISTS avatar_config JSONB DEFAULT NULL;

-- Update leaderboard sync trigger to include avatar_config
CREATE OR REPLACE FUNCTION sync_leaderboard_avatar()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE leaderboard
  SET avatar_image = NEW.avatar_image,
      profile_picture_url = NEW.profile_picture_url,
      avatar_config = NEW.avatar_config
  WHERE player_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists on profiles table
DROP TRIGGER IF EXISTS trigger_sync_leaderboard_avatar ON profiles;
CREATE TRIGGER trigger_sync_leaderboard_avatar
  AFTER UPDATE OF avatar_image, profile_picture_url, avatar_config ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_leaderboard_avatar();
