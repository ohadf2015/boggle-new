-- Enable Daily Buzz Images Feature Flag
-- This migration ensures the daily_buzz_images flag is enabled for all users

-- Update the feature flag to be enabled and visible to all users (not admin-only)
UPDATE feature_flags
SET
  enabled = true,
  admin_only = false,
  rollout_percentage = 100,
  updated_at = NOW()
WHERE flag_name = 'daily_buzz_images';

-- If the flag doesn't exist, create it
INSERT INTO feature_flags (flag_name, enabled, admin_only, rollout_percentage)
SELECT 'daily_buzz_images', true, false, 100
WHERE NOT EXISTS (
  SELECT 1 FROM feature_flags WHERE flag_name = 'daily_buzz_images'
);

-- Add a comment for documentation
COMMENT ON TABLE feature_flags IS 'Feature flags for gradual rollout. daily_buzz_images controls AI-generated hero images for Daily Buzz challenges.';
