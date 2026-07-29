-- Add skill tree persistence to player_progression
-- Part of Adventure Mode Phase 4: Skill tree DB persistence

ALTER TABLE player_progression ADD COLUMN IF NOT EXISTS skill_points INTEGER DEFAULT 0;
ALTER TABLE player_progression ADD COLUMN IF NOT EXISTS skill_tree JSONB DEFAULT '{}';
