-- =============================================
-- ASYNC FRIEND CHALLENGE — ASYNC-FIRST UNIFICATION
-- Migration: 20260513170000_async_challenge_async_first
--
-- Spec: fe-next/docs/specs/2026-05-13-friend-challenge-async-design.md
-- Extends async_board_challenges with state values + columns needed
-- to drive a draft -> pending -> accepted -> completed flow with push.
-- Additive only. Existing rows unaffected.
-- =============================================

ALTER TABLE public.async_board_challenges
  DROP CONSTRAINT IF EXISTS async_board_challenges_status_check;

ALTER TABLE public.async_board_challenges
  ADD CONSTRAINT async_board_challenges_status_check
  CHECK (status IN (
    'draft',
    'pending',
    'accepted',
    'completed',
    'declined',
    'expired',
    'expired_draft',
    'expired_unfinished'
  ));

ALTER TABLE public.async_board_challenges
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NOT NULL DEFAULT 90;

ALTER TABLE public.async_board_challenges
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en';

ALTER TABLE public.async_board_challenges
  ADD COLUMN IF NOT EXISTS grid_seed TEXT;

ALTER TABLE public.async_board_challenges
  ADD COLUMN IF NOT EXISTS winner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.async_board_challenges
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

ALTER TABLE public.async_board_challenges
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE public.async_board_challenges
  ALTER COLUMN challenger_score DROP NOT NULL;

ALTER TABLE public.async_board_challenges
  ALTER COLUMN challenger_words DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_abc_status_expires
  ON public.async_board_challenges (status, expires_at);

CREATE INDEX IF NOT EXISTS idx_abc_challenger_status
  ON public.async_board_challenges (challenger_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_abc_challenged_status
  ON public.async_board_challenges (challenged_id, status, created_at DESC);

ALTER TABLE public.async_board_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS async_board_challenges_select ON public.async_board_challenges;
CREATE POLICY async_board_challenges_select ON public.async_board_challenges
  FOR SELECT
  USING (
    auth.uid() = challenger_id
    OR (auth.uid() = challenged_id AND status <> 'draft' AND status <> 'expired_draft')
  );

DROP POLICY IF EXISTS async_board_challenges_insert ON public.async_board_challenges;
CREATE POLICY async_board_challenges_insert ON public.async_board_challenges
  FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS async_board_challenges_update ON public.async_board_challenges;
CREATE POLICY async_board_challenges_update ON public.async_board_challenges
  FOR UPDATE
  USING (false);

-- Hourly expiry sweep
SELECT cron.schedule(
  'friend-challenge-expiry-sweep',
  '17 * * * *',
  $$
  UPDATE public.async_board_challenges
  SET status = 'expired_draft'
  WHERE status = 'draft' AND created_at < (NOW() - INTERVAL '1 hour');

  UPDATE public.async_board_challenges
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();

  UPDATE public.async_board_challenges
  SET status = 'expired_unfinished'
  WHERE status = 'accepted' AND accepted_at < (NOW() - INTERVAL '24 hours');
  $$
);
