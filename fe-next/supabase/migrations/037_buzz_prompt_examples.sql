-- Migration: buzz_prompt_examples
-- Purpose: Store admin feedback on AI-generated challenges to improve future generations
-- This enables a learning loop where rejected challenges and feedback enhance the AI prompt

-- Table for storing admin feedback examples
CREATE TABLE IF NOT EXISTS buzz_prompt_examples (
  id BIGSERIAL PRIMARY KEY,

  -- Categorization for filtering
  language VARCHAR(5) NOT NULL,
  challenge_type VARCHAR(30) NOT NULL, -- 'anagram', 'fill_blank', 'riddle', 'word_chain', etc.

  -- The original problematic content
  original_prompt TEXT NOT NULL,
  original_answer TEXT NOT NULL,
  trend_topic TEXT,

  -- Admin feedback (required)
  feedback TEXT NOT NULL, -- What was wrong with the challenge

  -- Optional improvements (if admin provided corrections)
  improved_prompt TEXT,
  improved_answer TEXT,

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE, -- Soft delete capability

  -- Quality tracking for future analytics
  usage_count INTEGER NOT NULL DEFAULT 0 -- How many times included in prompts
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_buzz_prompt_examples_lang_type
  ON buzz_prompt_examples(language, challenge_type)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_buzz_prompt_examples_recent
  ON buzz_prompt_examples(created_at DESC)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_buzz_prompt_examples_active_lang
  ON buzz_prompt_examples(is_active, language);

-- Enable Row Level Security
ALTER TABLE buzz_prompt_examples ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view prompt examples
CREATE POLICY "Admins can read prompt examples"
  ON buzz_prompt_examples
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: Only admins can insert prompt examples
CREATE POLICY "Admins can insert prompt examples"
  ON buzz_prompt_examples
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: Only admins can update prompt examples (for soft delete, etc.)
CREATE POLICY "Admins can update prompt examples"
  ON buzz_prompt_examples
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Add table comment for documentation
COMMENT ON TABLE buzz_prompt_examples IS
  'Stores admin feedback on AI-generated Daily Buzz challenges. Used to improve future AI prompt quality by providing negative examples and corrections.';

COMMENT ON COLUMN buzz_prompt_examples.feedback IS
  'Admin description of what was wrong with the challenge (e.g., "word too obscure", "clue gives away answer")';

COMMENT ON COLUMN buzz_prompt_examples.usage_count IS
  'Tracks how many times this example has been included in AI prompts for analytics';
