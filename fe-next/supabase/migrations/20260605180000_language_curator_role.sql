-- =============================================
-- LANGUAGE CURATOR ("Native Moderator") ROLE — foundation (P0)
-- Migration: 20260605180000_language_curator_role
--
-- A scoped, non-admin role: a trusted native speaker assigned to one or more
-- languages who reviews content quality. Read-mostly; writes land in proposal /
-- review tables and feed the EXISTING verify->promote + nightly loops — never a
-- direct write to live gameplay content (zero blast radius in v1).
--
-- Design (locked, see docs/2026-06-05-language-curator-role-spec.md):
--   * Assignment ROWS, not a user_role enum value (additive, multi-language,
--     revocable, auditable; also dodges the same-transaction enum footgun).
--   * One SECURITY DEFINER helper is_language_curator(lang) drives all RLS.
--   * Two independent axes:
--       trust_tier     = CAPABILITY (admin-granted power; gates writes)
--       curator_points = PRESTIGE  (earned per RATIFIED proposal; fun rewards)
--
-- INERT ON APPLY: with zero assignment rows, is_language_curator() is false for
-- everyone, so the curator policies below grant nothing until a curator exists.
-- NOT added to supabase_realtime (no consumer) — see .claude/rules/50-supabase-perf.md.
-- =============================================

-- ---------------------------------------------
-- STEP 1: Assignment table (source of truth for the role)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.curator_language_assignments (
  curator_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language       TEXT NOT NULL CHECK (language IN ('en','he','sv','ja','es')),
  active         BOOLEAN NOT NULL DEFAULT true,
  trust_tier     SMALLINT NOT NULL DEFAULT 1 CHECK (trust_tier BETWEEN 1 AND 3),
  -- gamification ledger (PRESTIGE, not power): lifetime points for this language.
  curator_points INTEGER NOT NULL DEFAULT 0 CHECK (curator_points >= 0),
  assigned_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at     TIMESTAMPTZ,
  revoked_reason TEXT,
  notes          TEXT,
  PRIMARY KEY (curator_id, language)
);
CREATE INDEX IF NOT EXISTS idx_curator_lang_active
  ON public.curator_language_assignments (curator_id, language) WHERE active;
CREATE INDEX IF NOT EXISTS idx_curator_lang_by_lang
  ON public.curator_language_assignments (language) WHERE active;
ALTER TABLE public.curator_language_assignments ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.curator_language_assignments IS
  'Language Curator assignments. Role = >=1 active row. trust_tier=capability (admin-granted), curator_points=prestige (earned). Service-role manages; curators read own rows.';

-- ---------------------------------------------
-- STEP 2: Proposal table (curator actions land here, NOT on master content)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.curator_proposals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curator_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language      TEXT NOT NULL CHECK (language IN ('en','he','sv','ja','es')),
  kind          TEXT NOT NULL CHECK (kind IN
                  ('word_approve','word_reject','word_flag_invalid','puzzle_verdict')),
  target_ref    TEXT NOT NULL,                 -- a word, or a puzzle_id
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,  -- verdict, note, reason...
  status        TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN
                  ('proposed','ratified','rejected','reverted')),
  -- reward bookkeeping (idempotent): points + coins are granted once on ratify.
  points_awarded INTEGER NOT NULL DEFAULT 0,
  reward_granted BOOLEAN NOT NULL DEFAULT false,
  ratified_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ratified_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_curator_proposals_lang_status
  ON public.curator_proposals (language, status);
CREATE INDEX IF NOT EXISTS idx_curator_proposals_curator
  ON public.curator_proposals (curator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_curator_proposals_open
  ON public.curator_proposals (language, created_at) WHERE status = 'proposed';
ALTER TABLE public.curator_proposals ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.curator_proposals IS
  'Curator content actions as proposals. Ratified by admin (later: curator quorum/heuristic) which applies the effect via the existing promote path. Append-mostly audit trail.';

-- ---------------------------------------------
-- STEP 3: SECURITY DEFINER helpers (avoid RLS recursion + policy sprawl)
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.is_language_curator(p_language TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM curator_language_assignments ca
    JOIN profiles p ON p.id = ca.curator_id
    WHERE ca.curator_id = auth.uid()
      AND ca.language   = p_language
      AND ca.active     = true
      AND COALESCE(p.is_banned, false) = false   -- defence in depth
  );
$$;
COMMENT ON FUNCTION public.is_language_curator IS
  'True if the current user is an active, non-banned curator for the language. SECURITY DEFINER so policies can call it under strict RLS on the assignments table.';

CREATE OR REPLACE FUNCTION public.get_my_curator_languages()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(array_agg(DISTINCT ca.language ORDER BY ca.language), ARRAY[]::text[])
  FROM curator_language_assignments ca
  WHERE ca.curator_id = auth.uid()
    AND ca.active = true;
$$;
COMMENT ON FUNCTION public.get_my_curator_languages IS
  'Active languages the current user may curate (empty array if none).';

-- Convenience: admin check inlined for OR-ing into curator policies.
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  );
$$;
COMMENT ON FUNCTION public.is_admin_user IS 'True if current user is an admin (SECURITY DEFINER helper for policy reuse).';

-- ---------------------------------------------
-- STEP 4: RLS on the two NEW tables
-- ---------------------------------------------
-- Assignments: curators may read their OWN rows; all writes via service role.
DROP POLICY IF EXISTS "curators read own assignments" ON public.curator_language_assignments;
CREATE POLICY "curators read own assignments"
  ON public.curator_language_assignments FOR SELECT
  USING (curator_id = auth.uid() OR public.is_admin_user());

-- Proposals: curators read/insert their OWN, in a language they curate.
DROP POLICY IF EXISTS "curators read own proposals" ON public.curator_proposals;
CREATE POLICY "curators read own proposals"
  ON public.curator_proposals FOR SELECT
  USING (curator_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS "curators create proposals in their language" ON public.curator_proposals;
CREATE POLICY "curators create proposals in their language"
  ON public.curator_proposals FOR INSERT
  WITH CHECK (
    curator_id = auth.uid()
    AND public.is_language_curator(language)
    AND status = 'proposed'           -- curators can only OPEN proposals, never self-ratify
  );
-- (UPDATE to ratified/reverted is service-role / admin only — no curator UPDATE policy.)

-- ---------------------------------------------
-- STEP 5: Curator read access on existing content tables (additive; admin
-- policies untouched). All inert until an assignment row exists.
-- ---------------------------------------------
-- Rejected / not-in-dictionary words for their language (capability #2/#3).
DROP POLICY IF EXISTS "curators read invalid words in their language" ON public.invalid_word_submissions;
CREATE POLICY "curators read invalid words in their language"
  ON public.invalid_word_submissions FOR SELECT
  USING (public.is_language_curator(language) OR public.is_admin_user());

-- Community word-score health for their language.
DROP POLICY IF EXISTS "curators read word scores in their language" ON public.word_scores;
CREATE POLICY "curators read word scores in their language"
  ON public.word_scores FOR SELECT
  USING (public.is_language_curator(language) OR public.is_admin_user());

-- Connections puzzles in their locale (capability #1 — read).
DROP POLICY IF EXISTS "curators read puzzles in their locale" ON public.connections_puzzles;
CREATE POLICY "curators read puzzles in their locale"
  ON public.connections_puzzles FOR SELECT
  USING (public.is_language_curator(locale) OR public.is_admin_user());

-- Connections review verdicts: curators READ existing verdicts for their
-- language. They do NOT write here directly — a puzzle verdict is a
-- curator_proposals row (kind='puzzle_verdict'); ratification (service role)
-- writes the review. Single uniform trust path: curators only ever INSERT into
-- curator_proposals, so a rogue curator cannot mass-flag good puzzles 'bad' and
-- drive nightly-improvement churn. connections_puzzle_reviews stays advisory.
DROP POLICY IF EXISTS "curators read reviews in their language" ON public.connections_puzzle_reviews;
CREATE POLICY "curators read reviews in their language"
  ON public.connections_puzzle_reviews FOR SELECT
  USING (public.is_language_curator(language) OR public.is_admin_user());
