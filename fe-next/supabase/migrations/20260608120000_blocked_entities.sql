-- =============================================
-- PLAYER / GUEST BLOCKLIST — admin moderation: block by auth user id,
-- guest session id, or IP address.
-- Migration: 20260608120000_blocked_entities
--
-- A single, uniform blocklist that the realtime game-join path consults to
-- refuse entry to a blocked registered player (auth user id), a blocked guest
-- (guest session id), or any client behind a blocked IP. Each block is
-- optionally time-boxed (expires_at) or permanent (expires_at IS NULL).
--
-- Writes are admin-only via the service-role API (/api/admin/blocks); admins
-- may READ the list under RLS. The backend enforcement layer caches this table
-- in memory and refreshes on a short TTL — it never subscribes to it.
--
-- NOT added to supabase_realtime (no consumer) — see .claude/rules/50-supabase-perf.md.
-- =============================================

CREATE TABLE IF NOT EXISTS public.blocked_entities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- What kind of identifier `value` holds.
  block_type  TEXT NOT NULL CHECK (block_type IN ('auth_user','guest_session','ip')),
  -- The identifier itself: an auth.users id, a guest session id, or an IP string.
  value       TEXT NOT NULL CHECK (length(value) BETWEEN 1 AND 255),
  reason      TEXT,
  -- Admin who created the block (kept for audit; survives admin deletion).
  blocked_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- NULL = permanent. A future timestamp time-boxes the block.
  expires_at  TIMESTAMPTZ
);

-- One row per (type, value): re-blocking the same target upserts onto this,
-- refreshing the reason / expiry rather than stacking duplicate rows. This is
-- also the point-lookup index the cache-refresh + admin list queries use.
CREATE UNIQUE INDEX IF NOT EXISTS uq_blocked_entities_type_value
  ON public.blocked_entities (block_type, value);

-- Supports the periodic purge of expired rows (expires_at < now()).
CREATE INDEX IF NOT EXISTS idx_blocked_entities_expires_at
  ON public.blocked_entities (expires_at)
  WHERE expires_at IS NOT NULL;

ALTER TABLE public.blocked_entities ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.blocked_entities IS
  'Admin moderation blocklist. Refuses game-join for a blocked auth_user / guest_session / ip. expires_at NULL = permanent. Writes via service-role API; admins read under RLS. Not in supabase_realtime.';

-- Admins read the blocklist (admin UI). All writes go through the service-role
-- API, which bypasses RLS — so no INSERT/UPDATE/DELETE policy is granted here.
-- Reuses the existing is_admin_user() SECURITY DEFINER helper.
DROP POLICY IF EXISTS "admins read blocklist" ON public.blocked_entities;
CREATE POLICY "admins read blocklist"
  ON public.blocked_entities FOR SELECT
  USING (public.is_admin_user());
