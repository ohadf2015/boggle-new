-- UGC: Community Boards
-- Custom boards created by players for Classic/Boggle mode

CREATE TABLE IF NOT EXISTS community_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_code text UNIQUE NOT NULL,
  creator_id uuid REFERENCES auth.users(id),
  creator_guest_fingerprint text,
  creator_display_name text NOT NULL,
  creator_avatar jsonb,
  creator_profile_picture_url text,
  language text NOT NULL,
  title text NOT NULL,
  description text,
  grid jsonb NOT NULL,
  grid_size int NOT NULL DEFAULT 4,
  seed_words text[],
  total_findable_words int NOT NULL,
  difficulty text NOT NULL DEFAULT 'MEDIUM',
  timer_seconds int NOT NULL DEFAULT 120,
  is_public boolean DEFAULT true,
  moderation_status text DEFAULT 'approved',
  play_count int DEFAULT 0,
  rating_sum int DEFAULT 0,
  rating_count int DEFAULT 0,
  featured boolean DEFAULT false,
  featured_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_difficulty CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
  CONSTRAINT valid_moderation_status CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
  CONSTRAINT valid_grid_size CHECK (grid_size IN (4, 5, 6)),
  CONSTRAINT valid_timer CHECK (timer_seconds BETWEEN 30 AND 300),
  CONSTRAINT title_length CHECK (char_length(title) BETWEEN 1 AND 40),
  CONSTRAINT description_length CHECK (description IS NULL OR char_length(description) <= 140)
);

CREATE TABLE IF NOT EXISTS community_board_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid REFERENCES community_boards(id) ON DELETE CASCADE,
  player_id uuid REFERENCES auth.users(id),
  guest_fingerprint text,
  display_name text NOT NULL,
  custom_avatar jsonb,
  score int NOT NULL,
  word_count int NOT NULL,
  longest_word text,
  time_seconds int,
  completed_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_board_ratings (
  board_id uuid REFERENCES community_boards(id) ON DELETE CASCADE,
  player_id uuid REFERENCES auth.users(id) NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (board_id, player_id)
);

CREATE TABLE IF NOT EXISTS community_board_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid REFERENCES community_boards(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES auth.users(id),
  reason text NOT NULL CHECK (reason IN ('inappropriate', 'spam', 'unplayable', 'offensive')),
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_community_boards_code ON community_boards(board_code);
CREATE INDEX IF NOT EXISTS idx_community_boards_creator ON community_boards(creator_id);
CREATE INDEX IF NOT EXISTS idx_community_boards_gallery ON community_boards(is_public, moderation_status, play_count DESC);
CREATE INDEX IF NOT EXISTS idx_community_boards_featured ON community_boards(featured, featured_at DESC) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_community_boards_language ON community_boards(language, is_public) WHERE moderation_status = 'approved';
CREATE INDEX IF NOT EXISTS idx_board_plays_board ON community_board_plays(board_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_board_plays_player ON community_board_plays(player_id);

-- RLS Policies
ALTER TABLE community_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_board_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_board_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_board_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public boards readable" ON community_boards
  FOR SELECT USING (is_public = true AND moderation_status = 'approved');

CREATE POLICY "Own boards readable" ON community_boards
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Authenticated create boards" ON community_boards
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Own boards updatable" ON community_boards
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Own boards deletable" ON community_boards
  FOR DELETE USING (auth.uid() = creator_id);

CREATE POLICY "Plays readable" ON community_board_plays
  FOR SELECT USING (true);

CREATE POLICY "Plays insertable" ON community_board_plays
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Ratings by authenticated" ON community_board_ratings
  FOR ALL USING (auth.uid() = player_id);

CREATE POLICY "Reports by authenticated" ON community_board_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Views
CREATE OR REPLACE VIEW community_board_leaderboard AS
  SELECT
    board_id, player_id, display_name, custom_avatar,
    score, word_count, longest_word, time_seconds, completed_at,
    ROW_NUMBER() OVER (PARTITION BY board_id ORDER BY score DESC, word_count DESC) as rank
  FROM community_board_plays;

CREATE OR REPLACE VIEW community_board_creator_stats AS
  SELECT
    b.creator_id,
    COUNT(DISTINCT b.id) as boards_created,
    COALESCE(SUM(b.play_count), 0) as total_plays,
    COALESCE(SUM(b.rating_count), 0) as total_ratings,
    CASE WHEN SUM(b.rating_count) > 0
      THEN ROUND(SUM(b.rating_sum)::numeric / SUM(b.rating_count)::numeric, 2)
      ELSE 0
    END as average_rating,
    COUNT(DISTINCT b.id) FILTER (WHERE b.featured = true) as featured_count
  FROM community_boards b
  WHERE b.creator_id IS NOT NULL
  GROUP BY b.creator_id;
