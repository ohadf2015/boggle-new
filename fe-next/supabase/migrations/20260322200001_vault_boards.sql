CREATE TABLE IF NOT EXISTS vault_boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_name TEXT NOT NULL,
  grid JSONB NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  opens_at TIMESTAMPTZ NOT NULL,
  closes_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS vault_board_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vault_board_id UUID NOT NULL REFERENCES vault_boards(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  words_found INTEGER NOT NULL DEFAULT 0,
  played_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vault_board_id, player_id)
);
ALTER TABLE vault_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_board_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read vault boards" ON vault_boards FOR SELECT USING (true);
CREATE POLICY "Anyone can read vault scores" ON vault_board_scores FOR SELECT USING (true);
CREATE POLICY "Service manages vault" ON vault_boards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service manages vault scores" ON vault_board_scores FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_vault_boards_active ON vault_boards(is_active, opens_at);
CREATE INDEX idx_vault_scores_board ON vault_board_scores(vault_board_id, score DESC);
