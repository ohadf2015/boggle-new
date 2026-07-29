-- Ghost Rivals: weekly 1v1 skill-matched rivalry system
CREATE TABLE IF NOT EXISTS ghost_rivals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rival_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  player_score INTEGER DEFAULT 0,
  rival_score INTEGER DEFAULT 0,
  winner_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, week_start)
);

ALTER TABLE ghost_rivals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can read own rivals"
  ON ghost_rivals FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Service can manage rivals"
  ON ghost_rivals FOR ALL
  USING (true) WITH CHECK (true);

CREATE INDEX idx_ghost_rivals_player_week
  ON ghost_rivals(player_id, week_start);
