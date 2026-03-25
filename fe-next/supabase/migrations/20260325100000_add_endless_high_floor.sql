-- Add endless mode high floor tracking to player_progression
ALTER TABLE player_progression ADD COLUMN IF NOT EXISTS endless_high_floor INTEGER DEFAULT 0;
