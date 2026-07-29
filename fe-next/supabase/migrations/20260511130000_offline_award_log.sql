-- =============================================
-- offline_award_log — persistent idempotency for /api/scores/sync awards
--
-- The sync route's in-process dedupe cache (24h TTL) protects against
-- the common case of a client retrying a sync mid-flight. This table is
-- the durable backstop: if the cache evicts (server restart, multiple
-- instances), the submission_id PK on this table guarantees no
-- double-award when the same offline submission replays.
--
-- See: fe-next/docs/plans/2026-05-11-offline-mode-phase-1b-award-dispatch.md
-- =============================================

CREATE TABLE IF NOT EXISTS public.offline_award_log (
  submission_id  UUID         PRIMARY KEY,
  user_id        UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode           TEXT         NOT NULL,
  awarded_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  awards         JSONB        -- shape varies per mode; documented in processCompletion.ts files
);

-- Operator queries: "what did user X redeem in the last day?"
CREATE INDEX IF NOT EXISTS offline_award_log_user_awarded_idx
  ON public.offline_award_log (user_id, awarded_at DESC);

-- Operator queries: "how many offline submissions did mode Y award today?"
CREATE INDEX IF NOT EXISTS offline_award_log_mode_awarded_idx
  ON public.offline_award_log (mode, awarded_at DESC);

-- RLS: only service role writes (server-only). No client-readable rows
-- expected — keep RLS enabled with no policies so anon/authenticated
-- roles get an empty result set.
ALTER TABLE public.offline_award_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.offline_award_log IS
  'Persistent idempotency log for offline-mode award dispatch via /api/scores/sync. submission_id PK prevents double-credit if in-process dedupe cache evicts.';
