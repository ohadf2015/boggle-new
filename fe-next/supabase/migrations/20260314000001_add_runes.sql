-- Add rune system columns to player_progression
-- Part of Adventure Mode Phase 3: Rune System

ALTER TABLE player_progression ADD COLUMN IF NOT EXISTS rune_fragments INTEGER DEFAULT 0;
ALTER TABLE player_progression ADD COLUMN IF NOT EXISTS runes JSONB DEFAULT '[]';
