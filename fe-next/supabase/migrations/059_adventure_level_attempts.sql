-- =============================================
-- Adventure Mode: Level Attempts Tracking
-- =============================================
-- Tracks player attempts on levels, including best metrics
-- even when the level hasn't been completed (0 stars).
-- This enables "Partial Progress" UX showing encouragement
-- and progress tracking for failed attempts.
-- =============================================

-- Create level_attempts table
CREATE TABLE IF NOT EXISTS public.level_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  world INTEGER NOT NULL CHECK (world >= 1 AND world <= 10),
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 7),

  -- Best metrics across all attempts (updated when new attempt beats previous)
  best_words INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  best_time_remaining INTEGER NOT NULL DEFAULT 0,

  -- Objective progress (JSONB for flexibility with different objective types)
  -- Structure: { "wordCount": 5, "scoreTarget": 200, "longWords": 2, ... }
  objective_progress JSONB NOT NULL DEFAULT '{}',

  -- Attempt tracking for retry assist feature
  attempt_count INTEGER NOT NULL DEFAULT 0,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one record per user per level
  UNIQUE(user_id, world, level)
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_level_attempts_user_id
  ON public.level_attempts(user_id);

CREATE INDEX IF NOT EXISTS idx_level_attempts_world_level
  ON public.level_attempts(world, level);

-- =============================================
-- Row Level Security
-- =============================================

ALTER TABLE public.level_attempts ENABLE ROW LEVEL SECURITY;

-- Users can only view their own attempts
CREATE POLICY "Users can view own attempts"
  ON public.level_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own attempts
CREATE POLICY "Users can insert own attempts"
  ON public.level_attempts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own attempts
CREATE POLICY "Users can update own attempts"
  ON public.level_attempts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- Upsert Function for Attempt Tracking
-- =============================================

-- Function to record an attempt, updating best metrics if improved
CREATE OR REPLACE FUNCTION public.record_level_attempt(
  p_user_id UUID,
  p_world INTEGER,
  p_level INTEGER,
  p_words INTEGER,
  p_score INTEGER,
  p_time_remaining INTEGER,
  p_objective_progress JSONB,
  p_is_completion BOOLEAN DEFAULT FALSE
)
RETURNS public.level_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.level_attempts;
BEGIN
  -- Upsert the attempt record
  INSERT INTO public.level_attempts (
    user_id,
    world,
    level,
    best_words,
    best_score,
    best_time_remaining,
    objective_progress,
    attempt_count,
    consecutive_failures,
    first_attempt_at,
    last_attempt_at
  )
  VALUES (
    p_user_id,
    p_world,
    p_level,
    p_words,
    p_score,
    p_time_remaining,
    p_objective_progress,
    1,
    CASE WHEN p_is_completion THEN 0 ELSE 1 END,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, world, level)
  DO UPDATE SET
    -- Update best metrics only if new values are better
    best_words = GREATEST(level_attempts.best_words, EXCLUDED.best_words),
    best_score = GREATEST(level_attempts.best_score, EXCLUDED.best_score),
    best_time_remaining = GREATEST(level_attempts.best_time_remaining, EXCLUDED.best_time_remaining),
    -- Merge objective progress, keeping best values
    objective_progress = (
      SELECT jsonb_object_agg(
        key,
        GREATEST(
          COALESCE((level_attempts.objective_progress->>key)::INTEGER, 0),
          COALESCE((p_objective_progress->>key)::INTEGER, 0)
        )
      )
      FROM jsonb_each_text(
        level_attempts.objective_progress || p_objective_progress
      )
    ),
    -- Increment attempt count
    attempt_count = level_attempts.attempt_count + 1,
    -- Track consecutive failures (reset on completion)
    consecutive_failures = CASE
      WHEN p_is_completion THEN 0
      ELSE level_attempts.consecutive_failures + 1
    END,
    -- Update last attempt timestamp
    last_attempt_at = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.record_level_attempt TO authenticated;

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE public.level_attempts IS
  'Tracks player attempts on adventure levels, including partial progress on failed attempts';

COMMENT ON COLUMN public.level_attempts.objective_progress IS
  'JSONB storing best progress for each objective type (e.g., {"wordCount": 5, "scoreTarget": 200})';

COMMENT ON COLUMN public.level_attempts.consecutive_failures IS
  'Count of consecutive failed attempts, used for Retry Assist feature (resets on completion)';

COMMENT ON FUNCTION public.record_level_attempt IS
  'Records a level attempt, updating best metrics if the new attempt beats previous records';
