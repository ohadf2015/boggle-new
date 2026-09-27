-- Add word album tracking to player_progression
ALTER TABLE player_progression
ADD COLUMN IF NOT EXISTS word_album text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS word_album_claimed_milestones integer[] DEFAULT '{}';

COMMENT ON COLUMN player_progression.word_album IS 'All unique words found across adventure mode (uppercase)';
COMMENT ON COLUMN player_progression.word_album_claimed_milestones IS 'Claimed word album milestone targets (e.g. {50, 100})';

-- Weekly challenge leaderboard table
CREATE TABLE IF NOT EXISTS weekly_challenge_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_id text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  words_found integer NOT NULL DEFAULT 0,
  longest_word text NOT NULL DEFAULT '',
  player_name text NOT NULL DEFAULT 'Adventurer',
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_id)
);

CREATE INDEX IF NOT EXISTS idx_weekly_challenge_week_score
  ON weekly_challenge_scores(week_id, score DESC);

ALTER TABLE weekly_challenge_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read weekly scores"
  ON weekly_challenge_scores FOR SELECT USING (true);

CREATE POLICY "Users can insert own weekly scores"
  ON weekly_challenge_scores FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly scores"
  ON weekly_challenge_scores FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
