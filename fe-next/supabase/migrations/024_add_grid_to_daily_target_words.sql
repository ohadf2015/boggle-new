-- =====================================================
-- Migration 024: Add Grid Column to Daily Target Words
-- =====================================================
-- Stores the generated grid alongside the target word to ensure
-- consistency when the word changes and to validate the word is on the board.
-- =====================================================

-- Add grid column to store the generated grid as JSONB (2D array of letters)
ALTER TABLE daily_target_words
ADD COLUMN IF NOT EXISTS grid JSONB;

-- Add grid_generated_at to track when the grid was generated
ALTER TABLE daily_target_words
ADD COLUMN IF NOT EXISTS grid_generated_at TIMESTAMPTZ;

-- Add index for quick lookups by date and language
CREATE INDEX IF NOT EXISTS idx_daily_target_words_date_language
ON daily_target_words(puzzle_date, language);

-- Add INSERT policy for admin inserts (service role bypasses RLS)
DROP POLICY IF EXISTS "Admins can insert target words" ON daily_target_words;
CREATE POLICY "Admins can insert target words"
  ON daily_target_words
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Add comments for documentation
COMMENT ON COLUMN daily_target_words.grid IS 'Generated grid (2D array of letters) that contains the target word. Stored to ensure consistency and allow regeneration.';
COMMENT ON COLUMN daily_target_words.grid_generated_at IS 'Timestamp when the grid was generated. Used to determine if grid needs regeneration.';
