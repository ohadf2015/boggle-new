-- =============================================
-- TEACHER PRO GRANTS — complimentary Pro for a specific teacher, by email.
-- Migration: 20260905120000_teacher_pro_grants
--
-- WHY THIS EXISTS
-- On 2026-09-04 a real class (five students, under four minutes) could not
-- play because of two bugs on our side. We owe that teacher a year of Pro, and
-- the only way to give it was a hand-written row in `subscriptions` with no
-- record of who, why, or until when. This makes "grant Pro to <email> for N
-- days" a first-class, audited operation with an email attached.
--
-- MODEL
--   * A grant is written into the SAME `subscriptions` row a paid plan uses,
--     tagged `source = 'admin_grant'`, so every existing has_pro reader (class
--     caps, ProGate, status card) keeps working untouched.
--   * `current_period_end` is a hard deadline for a grant (nothing renews it);
--     lib/subscriptions.ts enforces that only for `source = 'admin_grant'`.
--   * `teacher_pro_grants` is the audit trail + the sign-up bridge: a grant for
--     an email with no account yet waits with `user_id IS NULL` and is claimed
--     on first sign-in (same bridge pattern as teacher_access_allowlist).
--   * `find_user_id_by_email` lets the service-role grant route resolve an
--     address to a user without paging auth.admin.listUsers. Execute is
--     service_role only — it must never be callable from a browser.
--
-- RLS: teacher reads own grant (the dashboard shows "gifted until …"), admins
-- read all; every write goes through the service-role client in the API.
-- NOT added to supabase_realtime (no consumer) — see .claude/rules/50-supabase-perf.md.
-- =============================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'polar'
    CHECK (source IN ('polar', 'lemon_squeezy', 'admin_grant'));

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS grant_id UUID;

COMMENT ON COLUMN public.subscriptions.source IS
  'Who owns this row''s lifecycle: the payment provider (webhooks) or an admin grant (hard deadline in current_period_end).';

CREATE TABLE IF NOT EXISTS public.teacher_pro_grants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  days          INTEGER NOT NULL CHECK (days > 0 AND days <= 3650),
  note          TEXT CHECK (note IS NULL OR length(note) <= 1000),
  reason        TEXT CHECK (reason IS NULL OR length(reason) <= 200),
  full_name     TEXT,
  locale        TEXT NOT NULL DEFAULT 'en',
  starts_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  applied_at    TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  welcomed_at   TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  revoked_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.teacher_pro_grants IS
  'Complimentary Teacher Pro grants by email. Audit trail + sign-up bridge; the entitlement itself lives in subscriptions (source=admin_grant).';
COMMENT ON COLUMN public.teacher_pro_grants.applied_at IS
  'When the subscriptions row was written. NULL = waiting for an account with this email to sign in.';
COMMENT ON COLUMN public.teacher_pro_grants.welcomed_at IS
  'When the teacher first saw the in-app "you are on Pro" celebration. Written at show-time, not dismiss-time.';

CREATE INDEX IF NOT EXISTS idx_tpg_email_pending
  ON public.teacher_pro_grants (lower(email)) WHERE applied_at IS NULL AND revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tpg_user ON public.teacher_pro_grants (user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_grant_id_fkey;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_grant_id_fkey
  FOREIGN KEY (grant_id) REFERENCES public.teacher_pro_grants(id) ON DELETE SET NULL;

ALTER TABLE public.teacher_pro_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tpg_select_own ON public.teacher_pro_grants;
CREATE POLICY tpg_select_own
  ON public.teacher_pro_grants FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS tpg_admin_select ON public.teacher_pro_grants;
CREATE POLICY tpg_admin_select
  ON public.teacher_pro_grants FOR SELECT
  USING (public.is_admin_user());

-- Service role bypasses RLS; no INSERT/UPDATE policy for other roles on purpose.

-- Resolve an email to a user id for the grant route. SECURITY DEFINER because
-- auth.users is not readable by the API roles; execute locked to service_role.
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_user_id_by_email(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(TEXT) TO service_role;

COMMENT ON FUNCTION public.find_user_id_by_email IS
  'service_role only: email -> auth.users.id for admin Pro grants.';
