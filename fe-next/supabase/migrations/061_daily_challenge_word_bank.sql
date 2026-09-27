-- Migration: Daily Challenge Word Bank
-- Purpose: Create a dedicated word bank for daily challenges with admin management
-- Date: 2025-01-25

-- Table: daily_challenge_word_bank
-- Stores available words for daily challenges with status management
CREATE TABLE IF NOT EXISTS daily_challenge_word_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('en', 'he', 'sv', 'ja', 'es', 'fr', 'de')),
  source TEXT NOT NULL DEFAULT 'static' CHECK (source IN ('static', 'dictionary', 'ai', 'admin', 'wikipedia')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'used')),
  difficulty_score INTEGER CHECK (difficulty_score >= 1 AND difficulty_score <= 10),
  category TEXT, -- Optional: for themed word selection
  times_used INTEGER DEFAULT 0, -- Track how often word was used
  last_used_at TIMESTAMPTZ, -- When word was last used
  created_at TIMESTAMPTZ DEFAULT NOW(),
  blocked_at TIMESTAMPTZ,
  blocked_by UUID REFERENCES profiles(id),
  blocked_reason TEXT,

  -- Unique constraint: same word+language can only appear once
  UNIQUE(word, language)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_word_bank_language_status ON daily_challenge_word_bank(language, status);
CREATE INDEX IF NOT EXISTS idx_word_bank_language_source ON daily_challenge_word_bank(language, source);
CREATE INDEX IF NOT EXISTS idx_word_bank_last_used ON daily_challenge_word_bank(last_used_at);
CREATE INDEX IF NOT EXISTS idx_word_bank_difficulty ON daily_challenge_word_bank(difficulty_score);

-- Enable RLS
ALTER TABLE daily_challenge_word_bank ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins can manage word bank"
  ON daily_challenge_word_bank
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Policy: Service role can do everything (for API routes)
CREATE POLICY "Service role full access to word bank"
  ON daily_challenge_word_bank
  FOR ALL
  USING (auth.role() = 'service_role');

-- Function to get random words from word bank
CREATE OR REPLACE FUNCTION get_random_words_from_bank(
  p_language TEXT,
  p_count INTEGER DEFAULT 10,
  p_exclude_words TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_min_days_since_used INTEGER DEFAULT 30
)
RETURNS TABLE (
  word TEXT,
  source TEXT,
  difficulty_score INTEGER,
  category TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    wb.word,
    wb.source,
    wb.difficulty_score,
    wb.category
  FROM daily_challenge_word_bank wb
  WHERE wb.language = p_language
    AND wb.status = 'active'
    AND wb.word != ALL(p_exclude_words)
    AND (
      wb.last_used_at IS NULL
      OR wb.last_used_at < NOW() - (p_min_days_since_used || ' days')::INTERVAL
    )
  ORDER BY RANDOM()
  LIMIT p_count;
END;
$$;

-- Function to mark word as used
CREATE OR REPLACE FUNCTION mark_word_bank_used(
  p_word TEXT,
  p_language TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE daily_challenge_word_bank
  SET
    times_used = times_used + 1,
    last_used_at = NOW()
  WHERE word = p_word AND language = p_language;
END;
$$;

-- Function to block a word
CREATE OR REPLACE FUNCTION block_word_bank_word(
  p_word TEXT,
  p_language TEXT,
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE daily_challenge_word_bank
  SET
    status = 'blocked',
    blocked_at = NOW(),
    blocked_by = p_admin_id,
    blocked_reason = p_reason
  WHERE word = p_word AND language = p_language;

  RETURN FOUND;
END;
$$;

-- Function to unblock a word
CREATE OR REPLACE FUNCTION unblock_word_bank_word(
  p_word TEXT,
  p_language TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE daily_challenge_word_bank
  SET
    status = 'active',
    blocked_at = NULL,
    blocked_by = NULL,
    blocked_reason = NULL
  WHERE word = p_word AND language = p_language;

  RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_random_words_from_bank TO authenticated;
GRANT EXECUTE ON FUNCTION mark_word_bank_used TO service_role;
GRANT EXECUTE ON FUNCTION block_word_bank_word TO authenticated;
GRANT EXECUTE ON FUNCTION unblock_word_bank_word TO authenticated;

-- Comments
COMMENT ON TABLE daily_challenge_word_bank IS 'Word bank for daily challenge word selection with admin management';
COMMENT ON COLUMN daily_challenge_word_bank.source IS 'Where the word came from: static (hardcoded), dictionary (main dict), ai (AI generated), admin (manually added), wikipedia (Wikipedia scrape)';
COMMENT ON COLUMN daily_challenge_word_bank.status IS 'active = available for selection, blocked = admin excluded, used = recently used';
COMMENT ON COLUMN daily_challenge_word_bank.difficulty_score IS 'Word difficulty 1-10, used for balanced selection';
