-- Word Forge mode: meta-progression table
-- Tracks XP, unlocks, stats across runs

CREATE TABLE IF NOT EXISTS word_forge_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  unlock_tier INTEGER NOT NULL DEFAULT 0,
  highest_round INTEGER NOT NULL DEFAULT 0,
  total_runs INTEGER NOT NULL DEFAULT 0,
  runs_won INTEGER NOT NULL DEFAULT 0,
  best_run_score INTEGER NOT NULL DEFAULT 0,
  max_rune_slots INTEGER NOT NULL DEFAULT 5,
  daily_streak INTEGER NOT NULL DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_word_forge_progress_user ON word_forge_progress(user_id);

-- RLS: users can only read/write their own progress
ALTER TABLE word_forge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own word forge progress"
  ON word_forge_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own word forge progress"
  ON word_forge_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own word forge progress"
  ON word_forge_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for API routes)
CREATE POLICY "Service role full access word forge"
  ON word_forge_progress FOR ALL
  USING (auth.role() = 'service_role');

-- Add word_forge feature flag (admin_only)
INSERT INTO feature_flags (flag_name, enabled, admin_only, rollout_percentage)
VALUES ('word_forge', true, true, 0)
ON CONFLICT (flag_name) DO NOTHING;
