-- =============================================
-- SCHOOL LEADS — "LexiClash for Schools" lead capture.
-- Migration: 20260608190000_school_leads
--
-- Public, anonymous lead form on /education/for-schools. Captures paying-intent
-- signals from schools/districts WITHOUT gating the free-forever classroom
-- product: role (incl. budget-authority roles), school/district name,
-- student-count bucket (per-student-license size proxy), and which paid surfaces
-- they're interested in (district dashboard, analytics, content libraries,
-- ad-free, SSO, pricing). The org fields qualify the lead; interests rank it.
--
-- Anyone may INSERT (the public form, via the anon/cookie client used by the
-- Next route). Admins READ under RLS for follow-up. There is no UPDATE/DELETE
-- policy — leads are append-only from the public path; admin ops use the
-- service-role API which bypasses RLS.
--
-- NOT added to supabase_realtime (no consumer) — see .claude/rules/50-supabase-perf.md.
-- =============================================

CREATE TABLE IF NOT EXISTS public.school_leads (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  email              TEXT NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
  full_name          TEXT NOT NULL CHECK (length(full_name) BETWEEN 2 AND 120),
  role               TEXT NOT NULL CHECK (role IN
                       ('teacher','head_of_department','curriculum_lead','school_admin','district_admin','other')),
  school_or_district TEXT NOT NULL CHECK (length(school_or_district) BETWEEN 2 AND 200),
  student_count      TEXT NOT NULL CHECK (student_count IN
                       ('lt_50','50_200','200_500','500_2000','gte_2000')),
  interests          TEXT[] NOT NULL DEFAULT '{}',
  country            TEXT CHECK (country IS NULL OR length(country) <= 80),
  message            TEXT CHECK (message IS NULL OR length(message) <= 800),
  locale             TEXT NOT NULL CHECK (locale IN ('en','he','sv','ja','es')),
  source             TEXT NOT NULL DEFAULT 'for-schools-page'
);

-- Rate-limit lookup (email + recent window) and admin triage by recency.
CREATE INDEX IF NOT EXISTS idx_school_leads_email_created
  ON public.school_leads (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_school_leads_created
  ON public.school_leads (created_at DESC);

ALTER TABLE public.school_leads ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.school_leads IS
  'For-Schools lead capture. Public anon INSERT; admins read under RLS. Append-only from public path. Not in supabase_realtime.';

-- Public form may submit (server route uses the anon/cookie client).
DROP POLICY IF EXISTS "anyone can submit a school lead" ON public.school_leads;
CREATE POLICY "anyone can submit a school lead"
  ON public.school_leads FOR INSERT
  WITH CHECK (true);

-- Admins read leads for follow-up. Reuses the existing is_admin_user() helper.
DROP POLICY IF EXISTS "admins read school leads" ON public.school_leads;
CREATE POLICY "admins read school leads"
  ON public.school_leads FOR SELECT
  USING (public.is_admin_user());
