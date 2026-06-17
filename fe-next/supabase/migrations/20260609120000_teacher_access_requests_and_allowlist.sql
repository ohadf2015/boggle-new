-- =============================================
-- TEACHER ACCESS — admin-approved education access gate.
-- Migration: 20260609120000_teacher_access_requests_and_allowlist
--
-- WHY THIS EXISTS / WHAT IT FIXES
-- The teacher-access feature (apply form at /education/access, admin queue at
-- /admin/teacher-access, approve/decline/export API, email pipeline) shipped
-- with its tables + RLS applied ad-hoc via the Supabase MCP during the original
-- build — they were NEVER committed as a migration. Result: production's RLS
-- state for `teacher_access_requests` is unversioned and unauditable, and the
-- admin-SELECT policy is effectively absent, so the admin queue reads back an
-- empty set under RLS even though inserts (anon apply form) and the admin
-- notification email both succeed. Symptom reported by the operator: "someone
-- requested teacher access but I don't see it in the admin dashboard at all"
-- (the notification email DID arrive — proving the row exists in the DB).
--
-- This migration reconciles the full feature schema + RLS into version control,
-- fully idempotent (CREATE TABLE IF NOT EXISTS / DROP POLICY IF EXISTS) so it is
-- a safe no-op where objects already exist and a repair where a policy is
-- missing. Going forward CI (`supabase db push`) keeps prod in sync.
--
-- RLS MODEL
--   teacher_access_requests
--     - anyone may INSERT          (public apply form via anon/cookie client)
--     - applicant may SELECT own   (status polling for signed-in applicants)
--     - admins may SELECT / UPDATE  (the admin queue + approve/decline)  <-- the fix
--   teacher_access_allowlist (anonymous-applicant -> signup bridge)
--     - admins may SELECT/INSERT/UPDATE (approve route writes the entry)
--     - a signed-in user may SELECT/UPDATE the entry that matches THEIR OWN
--       email, so the post-signup consume bridge can claim it (without this the
--       bridge silently no-ops under RLS — a second latent gap in the same
--       un-versioned schema).
--
-- Reuses public.is_admin_user() (SECURITY DEFINER helper) — same convention as
-- the sibling school_leads feature.
--
-- NOT added to supabase_realtime (no consumer) — see .claude/rules/50-supabase-perf.md.
-- =============================================

-- ---------------------------------------------
-- TABLES
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_access_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  school_or_org TEXT,
  country       TEXT,
  role          TEXT NOT NULL CHECK (role IN ('teacher','tutor','admin','parent','researcher','other')),
  locale        TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en','he','sv','ja','es')),
  use_case      TEXT NOT NULL CHECK (length(use_case) <= 800),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined')),
  admin_note    TEXT,
  reviewed_at   TIMESTAMPTZ,
  reviewed_by   UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tar_status ON public.teacher_access_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tar_user   ON public.teacher_access_requests(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tar_email  ON public.teacher_access_requests(email);

CREATE TABLE IF NOT EXISTS public.teacher_access_allowlist (
  email               TEXT PRIMARY KEY,
  approved_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by         UUID REFERENCES auth.users(id),
  source_request_id   UUID REFERENCES public.teacher_access_requests(id),
  consumed_at         TIMESTAMPTZ,
  consumed_by_user_id UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_taa_consumed ON public.teacher_access_allowlist(consumed_at) WHERE consumed_at IS NULL;

ALTER TABLE public.teacher_access_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_access_allowlist ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.teacher_access_requests IS
  'Teacher/education access applications. Public anon INSERT; applicant reads own; admins read+update under RLS.';
COMMENT ON TABLE public.teacher_access_allowlist IS
  'Pre-approved emails bridging anonymous applicants to teacher role on signup. Admin-managed; self-consume by matching email.';

-- ---------------------------------------------
-- RLS — teacher_access_requests
-- ---------------------------------------------
-- Remove the superseded ad-hoc policies from the original un-versioned MCP
-- setup. `tar_insert_authenticated` (WITH CHECK auth.uid() IS NOT NULL) is the
-- bug: the public apply form posts via the anon/cookie client with user_id
-- null, so every guest submission was denied by RLS and returned a 500. The
-- old `tar_select` / `tar_update_admin` duplicate the canonical policies below.
DROP POLICY IF EXISTS tar_insert_authenticated ON public.teacher_access_requests;
DROP POLICY IF EXISTS tar_select               ON public.teacher_access_requests;
DROP POLICY IF EXISTS tar_update_admin         ON public.teacher_access_requests;

-- Public apply form may submit (server route uses the anon/cookie client).
DROP POLICY IF EXISTS tar_insert_any ON public.teacher_access_requests;
CREATE POLICY tar_insert_any
  ON public.teacher_access_requests FOR INSERT
  WITH CHECK (true);

-- A signed-in applicant may read their own request (status polling).
DROP POLICY IF EXISTS tar_select_own ON public.teacher_access_requests;
CREATE POLICY tar_select_own
  ON public.teacher_access_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Admins read the full queue. THIS is the policy whose absence hid requests
-- from the admin dashboard.
DROP POLICY IF EXISTS tar_admin_select ON public.teacher_access_requests;
CREATE POLICY tar_admin_select
  ON public.teacher_access_requests FOR SELECT
  USING (public.is_admin_user());

-- Admins approve / decline (status, admin_note, reviewed_*).
DROP POLICY IF EXISTS tar_admin_update ON public.teacher_access_requests;
CREATE POLICY tar_admin_update
  ON public.teacher_access_requests FOR UPDATE
  USING (public.is_admin_user());

-- ---------------------------------------------
-- RLS — teacher_access_allowlist
-- ---------------------------------------------
-- Admins manage the allowlist (the approve route inserts entries here).
DROP POLICY IF EXISTS taa_admin_select ON public.teacher_access_allowlist;
CREATE POLICY taa_admin_select
  ON public.teacher_access_allowlist FOR SELECT
  USING (public.is_admin_user());

DROP POLICY IF EXISTS taa_admin_insert ON public.teacher_access_allowlist;
CREATE POLICY taa_admin_insert
  ON public.teacher_access_allowlist FOR INSERT
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS taa_admin_update ON public.teacher_access_allowlist;
CREATE POLICY taa_admin_update
  ON public.teacher_access_allowlist FOR UPDATE
  USING (public.is_admin_user());

-- Signup bridge: a signed-in user may read + claim the entry matching their own
-- email (case-insensitive). Without these the consume-allowlist route reads
-- nothing under RLS and the pre-approval never upgrades the new account.
DROP POLICY IF EXISTS taa_select_own_email ON public.teacher_access_allowlist;
CREATE POLICY taa_select_own_email
  ON public.teacher_access_allowlist FOR SELECT
  USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

DROP POLICY IF EXISTS taa_update_own_email ON public.teacher_access_allowlist;
CREATE POLICY taa_update_own_email
  ON public.teacher_access_allowlist FOR UPDATE
  USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
