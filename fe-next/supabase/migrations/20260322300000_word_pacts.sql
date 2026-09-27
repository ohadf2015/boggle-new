-- Word Pacts: Social commitment feature
-- Two friends form a pact and both must play daily for bonus multipliers.

CREATE TABLE IF NOT EXISTS word_pacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  player1_played_today BOOLEAN DEFAULT false,
  player2_played_today BOOLEAN DEFAULT false,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  active BOOLEAN DEFAULT true,
  streak INTEGER DEFAULT 0,
  UNIQUE(player1_id, player2_id)
);

ALTER TABLE word_pacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can read own pacts"
  ON word_pacts FOR SELECT
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Service can manage pacts"
  ON word_pacts FOR ALL
  USING (true) WITH CHECK (true);

CREATE INDEX idx_word_pacts_players ON word_pacts(player1_id, player2_id);
