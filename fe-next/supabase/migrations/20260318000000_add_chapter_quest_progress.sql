-- Add chapter_quest_progress JSONB column to player_progression
-- Fixes bug where quest progress was stored in React useState and lost between sessions
-- Now persists as { questId: currentCount } map in the database
ALTER TABLE player_progression
ADD COLUMN IF NOT EXISTS chapter_quest_progress jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN player_progression.chapter_quest_progress IS 'Persistent chapter quest progress map: { questId: currentCount }';
