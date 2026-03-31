-- Add engagement feature columns to profiles for cross-device sync
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mp_win_streak_classic integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mp_win_streak_wordhunt integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mp_best_streak_classic integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mp_best_streak_wordhunt integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_freeze_count integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS season_peak_tier jsonb DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS equipped_cosmetics jsonb DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS purchased_cosmetics text[] DEFAULT '{}';
