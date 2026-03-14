-- Add gold and upgrades columns to player_progression
-- Part of Adventure Mode Phase 0: Gold Persistence fix

ALTER TABLE player_progression ADD COLUMN IF NOT EXISTS gold INTEGER DEFAULT 0;
ALTER TABLE player_progression ADD COLUMN IF NOT EXISTS upgrades JSONB DEFAULT '{}';
