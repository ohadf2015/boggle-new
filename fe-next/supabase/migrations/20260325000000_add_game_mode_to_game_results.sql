-- Add game_mode column to game_results for per-mode popularity tracking
-- Values match GameMode type: 'classic', 'blast', 'word-hunt'
-- Default 'classic' since existing rows are predominantly classic multiplayer games

ALTER TABLE game_results
  ADD COLUMN IF NOT EXISTS game_mode TEXT NOT NULL DEFAULT 'classic';

-- Index for fast aggregation queries (mode popularity, admin stats)
CREATE INDEX IF NOT EXISTS idx_game_results_game_mode
  ON game_results (game_mode);

-- Composite index for time-bounded mode stats (e.g., "plays per mode last 30 days")
CREATE INDEX IF NOT EXISTS idx_game_results_game_mode_created_at
  ON game_results (game_mode, created_at DESC);
