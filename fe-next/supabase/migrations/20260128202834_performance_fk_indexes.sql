-- Migration: Add missing indexes for unindexed foreign keys
-- These foreign keys were identified by Supabase performance advisor as missing covering indexes
-- Without indexes, DELETE/UPDATE operations on parent tables require sequential scans

-- Index for buzz_prompt_examples.created_by (references profiles.id)
CREATE INDEX IF NOT EXISTS idx_buzz_prompt_examples_created_by
ON public.buzz_prompt_examples (created_by);

-- Index for buzz_prompt_templates.created_by (references profiles.id)
CREATE INDEX IF NOT EXISTS idx_buzz_prompt_templates_created_by
ON public.buzz_prompt_templates (created_by);

-- Index for buzz_prompt_templates.updated_by (references profiles.id)
CREATE INDEX IF NOT EXISTS idx_buzz_prompt_templates_updated_by
ON public.buzz_prompt_templates (updated_by);

-- Index for daily_challenge_word_bank.blocked_by (references profiles.id)
-- Partial index for non-null values since this column is optional
CREATE INDEX IF NOT EXISTS idx_daily_challenge_word_bank_blocked_by
ON public.daily_challenge_word_bank (blocked_by)
WHERE blocked_by IS NOT NULL;

-- Index for game_cognitive_scores.game_session_id (references game_sessions.id)
CREATE INDEX IF NOT EXISTS idx_game_cognitive_scores_game_session_id
ON public.game_cognitive_scores (game_session_id);

-- Index for invalid_word_submissions.approved_by (references profiles.id)
-- Partial index for non-null values since this column is optional
CREATE INDEX IF NOT EXISTS idx_invalid_word_submissions_approved_by
ON public.invalid_word_submissions (approved_by)
WHERE approved_by IS NOT NULL;
