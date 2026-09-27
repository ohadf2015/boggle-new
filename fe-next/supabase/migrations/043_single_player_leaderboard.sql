-- Single Player Leaderboard Table
-- Stores guest single-player scores (uses string fingerprint instead of UUID)

CREATE TABLE IF NOT EXISTS single_player_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_fingerprint TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL DEFAULT 'Guest',
  avatar_emoji TEXT DEFAULT '🎮',
  avatar_color TEXT DEFAULT '#6366f1',
  total_score INTEGER DEFAULT 0 CHECK (total_score >= 0),
  games_played INTEGER DEFAULT 0 CHECK (games_played >= 0),
  longest_word TEXT,
  best_score INTEGER DEFAULT 0 CHECK (best_score >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sp_leaderboard_fingerprint ON single_player_leaderboard(guest_fingerprint);
CREATE INDEX IF NOT EXISTS idx_sp_leaderboard_score ON single_player_leaderboard(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_sp_leaderboard_games ON single_player_leaderboard(games_played DESC);

-- Enable RLS
ALTER TABLE single_player_leaderboard ENABLE ROW LEVEL SECURITY;

-- Anyone can read the leaderboard
CREATE POLICY "Anyone can view single player leaderboard" ON single_player_leaderboard
  FOR SELECT
  USING (true);

-- Server/service role can insert and update
CREATE POLICY "Service can insert single player scores" ON single_player_leaderboard
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update single player scores" ON single_player_leaderboard
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create view for top scores
CREATE OR REPLACE VIEW single_player_top_scores AS
SELECT
  guest_fingerprint,
  username,
  avatar_emoji,
  avatar_color,
  total_score,
  games_played,
  best_score,
  longest_word,
  RANK() OVER (ORDER BY total_score DESC) as rank_position,
  updated_at
FROM single_player_leaderboard
WHERE games_played > 0
ORDER BY total_score DESC
LIMIT 100;

-- Grant permissions
GRANT SELECT ON single_player_top_scores TO anon, authenticated;

COMMENT ON TABLE single_player_leaderboard IS 'Stores guest single-player game scores and stats';
