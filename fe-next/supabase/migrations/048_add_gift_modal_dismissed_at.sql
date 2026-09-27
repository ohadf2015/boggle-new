-- Add gift_modal_dismissed_at column to track when user dismissed the gift modal
-- This replaces sessionStorage tracking with persistent database storage

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS gift_modal_dismissed_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_gift_modal_dismissed
ON profiles(gift_modal_dismissed_at)
WHERE gift_modal_dismissed_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.gift_modal_dismissed_at IS 'Timestamp when user last dismissed the gift modal auto-show. NULL means modal has never been dismissed and can auto-show.';
