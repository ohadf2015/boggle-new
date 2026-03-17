-- UGC: Community Word Packs

CREATE TABLE IF NOT EXISTS ugc_word_packs (
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
  deleted_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT name_length CHECK (char_length(name) BETWEEN 1 AND 50),
  CONSTRAINT desc_length CHECK (description IS NULL OR char_length(description) <= 140),
  CONSTRAINT min_words CHECK (array_length(words, 1) >= 10),
  CONSTRAINT valid_mod_status CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged'))
);

CREATE TABLE IF NOT EXISTS ugc_pack_upvotes (
  pack_id uuid REFERENCES ugc_word_packs(id) ON DELETE CASCADE,
  player_id uuid REFERENCES auth.users(id),
  PRIMARY KEY (pack_id, player_id)
);

CREATE TABLE IF NOT EXISTS ugc_pack_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid REFERENCES ugc_word_packs(id) ON DELETE CASCADE,
  player_id uuid REFERENCES auth.users(id),
  guest_fingerprint text,
  words_found_from_pack int,
  total_score int,
  played_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ugc_pack_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid REFERENCES ugc_word_packs(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES auth.users(id),
  reason text NOT NULL CHECK (reason IN ('inappropriate', 'spam', 'unplayable', 'offensive')),
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ugc_word_packs_creator ON ugc_word_packs(creator_id);
CREATE INDEX IF NOT EXISTS idx_ugc_word_packs_gallery ON ugc_word_packs(is_public, moderation_status, play_count DESC);
CREATE INDEX IF NOT EXISTS idx_ugc_word_packs_language ON ugc_word_packs(language) WHERE is_public = true AND moderation_status = 'approved';
CREATE INDEX IF NOT EXISTS idx_ugc_pack_plays_pack ON ugc_pack_plays(pack_id);

-- RLS
ALTER TABLE ugc_word_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ugc_pack_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ugc_pack_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE ugc_pack_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public packs readable" ON ugc_word_packs
  FOR SELECT USING (is_public = true AND moderation_status = 'approved');

CREATE POLICY "Own packs readable" ON ugc_word_packs
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Authenticated create packs" ON ugc_word_packs
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Own packs updatable" ON ugc_word_packs
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Own packs deletable" ON ugc_word_packs
  FOR DELETE USING (auth.uid() = creator_id);

CREATE POLICY "Upvotes by authenticated" ON ugc_pack_upvotes
  FOR ALL USING (auth.uid() = player_id);

CREATE POLICY "Pack plays readable" ON ugc_pack_plays
  FOR SELECT USING (true);

CREATE POLICY "Pack plays insertable" ON ugc_pack_plays
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Reports insertable" ON ugc_pack_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- RPC: increment/decrement upvote count
CREATE OR REPLACE FUNCTION increment_pack_upvote(pack_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE ugc_word_packs SET upvote_count = upvote_count + 1 WHERE id = pack_id;
$$;

CREATE OR REPLACE FUNCTION decrement_pack_upvote(pack_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE ugc_word_packs SET upvote_count = GREATEST(upvote_count - 1, 0) WHERE id = pack_id;
$$;

CREATE OR REPLACE FUNCTION increment_pack_play(pack_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE ugc_word_packs SET play_count = play_count + 1 WHERE id = pack_id;
$$;
