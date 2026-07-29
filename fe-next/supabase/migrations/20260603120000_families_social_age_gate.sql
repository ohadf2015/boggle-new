-- Google Families Policy — social-features compliance.
-- Adds age signal + adult-managed social override to profiles.
-- See docs/2026-06-03-families-policy-social-compliance.md
--
-- birth_year (not full DOB) minimises PII collected from children.
-- social_features_override: adult-set per-capability override (JSONB), only
-- writable behind an in-app adult-action gate. NULL = use the age-tier default.
-- No supabase_realtime publication change (no consumer) per .claude/rules/50-supabase-perf.md.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_year SMALLINT,
  ADD COLUMN IF NOT EXISTS age_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS safety_ack_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS social_features_override JSONB;

-- Guard against impossible birth years at the DB level (defence in depth;
-- the app's neutral age screen is the primary validator).
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_birth_year_plausible;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_birth_year_plausible
  CHECK (birth_year IS NULL OR (birth_year >= 1900 AND birth_year <= 2100));

COMMENT ON COLUMN public.profiles.birth_year IS
  'Self-declared birth year (neutral age screen). Drives Families Policy social tier. Year-only to minimise child PII.';
COMMENT ON COLUMN public.profiles.social_features_override IS
  'Adult-managed per-capability override (SocialCapabilities partial). NULL = age-tier default. Writable only behind an adult-action gate.';
