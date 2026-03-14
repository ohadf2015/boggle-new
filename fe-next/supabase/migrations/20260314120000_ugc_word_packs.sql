-- UGC: Community Word Packs

CREATE TABLE IF NOT EXISTS word_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES auth.users(id) NOT NULL,
  creator_display_name text NOT NULL,
  creator_avatar jsonb,
  name text NOT NULL,
  description text,
  language text NOT NULL,
  theme_emoji text,
  words text[] NOT NULL,
  word_count int GENERATED ALWAYS AS (array_length(words, 1)) STORED,
  tags text[],
  is_public boolean DEFAULT true,
  moderation_status text DEFAULT 'approved',
  play_count int DEFAULT 0,
  upvote_count int DEFAULT 0,
  featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT name_length CHECK (char_length(name) BETWEEN 1 AND 50),
  CONSTRAINT desc_length CHECK (description IS NULL OR char_length(description) <= 140),
  CONSTRAINT min_words CHECK (array_length(words, 1) >= 10),
  CONSTRAINT valid_mod_status CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged'))
);

CREATE TABLE IF NOT EXISTS word_pack_upvotes (
  pack_id uuid REFERENCES word_packs(id) ON DELETE CASCADE,
  player_id uuid REFERENCES auth.users(id),
  PRIMARY KEY (pack_id, player_id)
);

CREATE TABLE IF NOT EXISTS word_pack_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid REFERENCES word_packs(id) ON DELETE CASCADE,
  player_id uuid REFERENCES auth.users(id),
  guest_fingerprint text,
  words_found_from_pack int,
  total_score int,
  played_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_word_packs_creator ON word_packs(creator_id);
CREATE INDEX IF NOT EXISTS idx_word_packs_gallery ON word_packs(is_public, moderation_status, play_count DESC);
CREATE INDEX IF NOT EXISTS idx_word_packs_language ON word_packs(language) WHERE is_public = true AND moderation_status = 'approved';
CREATE INDEX IF NOT EXISTS idx_word_pack_plays_pack ON word_pack_plays(pack_id);

-- RLS
ALTER TABLE word_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_pack_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_pack_plays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public packs readable" ON word_packs
  FOR SELECT USING (is_public = true AND moderation_status = 'approved');

CREATE POLICY "Own packs readable" ON word_packs
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Authenticated create packs" ON word_packs
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Own packs updatable" ON word_packs
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Own packs deletable" ON word_packs
  FOR DELETE USING (auth.uid() = creator_id);

CREATE POLICY "Upvotes by authenticated" ON word_pack_upvotes
  FOR ALL USING (auth.uid() = player_id);

CREATE POLICY "Pack plays readable" ON word_pack_plays
  FOR SELECT USING (true);

CREATE POLICY "Pack plays insertable" ON word_pack_plays
  FOR INSERT WITH CHECK (true);
