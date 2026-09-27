-- Add premium avatar parts column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_avatar_parts JSONB DEFAULT '[]';

-- Add comment
COMMENT ON COLUMN profiles.premium_avatar_parts IS 'Array of permanently unlocked premium avatar part IDs (e.g. ["eyes:laser", "accessory:crown"])';
