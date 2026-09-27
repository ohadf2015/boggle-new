-- =============================================
-- PER-STUDENT DIFFERENTIATION LEVEL
-- Migration: 20260905130000_classroom_membership_level
-- =============================================
--
-- WHY
-- A 6th–8th grade special-education ELA teacher (mixed intervention group) asked for
-- "different difficulty levels or some way to differentiate within the same class —
-- my students can have very different reading and vocabulary levels even when they're
-- in the same grade." Until now difficulty was a property of the GAME (min word
-- length, board size, timer) and applied to every student identically. Nothing was
-- per-student.
--
-- WHAT
-- One level per (classroom, student), on the membership row the student already has:
--   support   → sees a word bank during live games; practises support + core words
--   core      → default; behaves exactly as today
--   challenge → practises all words incl. challenge-tier; gets a longer-word target
-- Lesson words carry a matching tier in `vocabulary_lessons.words[*].level` (JSONB,
-- absent = core) — no schema change needed there.
--
-- The level lives on `classroom_memberships`, not `profiles`, because a student can be
-- "support" in one class and "core" in another, and because it is the TEACHER's call
-- for THEIR class.
--
-- ACCESS
-- * Teachers own this value: they need UPDATE on memberships of classrooms they own.
--   Migration 057 gave the owning teacher SELECT / INSERT / DELETE via
--   is_classroom_owner() but never UPDATE (nothing was updatable before), so a
--   request-scoped PATCH would match 0 rows with error:null — a silent no-op. The
--   API route writes through the service role AND asserts one row changed, but the
--   policy exists so the RLS surface is coherent (dashboard tooling, future reads).
-- * Students read their own row already ("Students can view own memberships",
--   20260128201418). No student write policy: a student must not promote themselves.
--
-- NOT in the realtime publication (see .claude/rules/50-supabase-perf.md): there is
-- no postgres_changes consumer; the level is read on join / on game join.
--
-- Idempotent: safe to re-run.

ALTER TABLE public.classroom_memberships
    ADD COLUMN IF NOT EXISTS level TEXT NOT NULL DEFAULT 'core';

-- CHECK constraint added separately so re-running the migration on a table that
-- already has the column still converges.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'classroom_memberships_level_check'
          AND conrelid = 'public.classroom_memberships'::regclass
    ) THEN
        ALTER TABLE public.classroom_memberships
            ADD CONSTRAINT classroom_memberships_level_check
            CHECK (level IN ('support', 'core', 'challenge'));
    END IF;
END $$;

COMMENT ON COLUMN public.classroom_memberships.level IS
'Teacher-set differentiation tier for this student in this classroom: support | core (default) | challenge. Drives solo-practice word filtering and live-game scaffolding (word bank / longer-word target).';

-- Owning teacher may update memberships of their own classroom (level today; any
-- future per-student setting tomorrow). Both USING and WITH CHECK so a row cannot be
-- moved to a classroom the teacher does not own.
DROP POLICY IF EXISTS "Teachers can update classroom memberships" ON public.classroom_memberships;
CREATE POLICY "Teachers can update classroom memberships"
    ON public.classroom_memberships FOR UPDATE
    USING (is_classroom_owner(classroom_id, (SELECT auth.uid())))
    WITH CHECK (is_classroom_owner(classroom_id, (SELECT auth.uid())));

COMMENT ON POLICY "Teachers can update classroom memberships" ON public.classroom_memberships IS
'Owning teacher may edit rows of their own classroom (e.g. per-student differentiation level). Students have no UPDATE policy on purpose.';

-- Student SELECT of own row is already granted by "Students can view own memberships"
-- (20260128201418). Re-assert idempotently in case a later cleanup dropped it — the
-- solo-practice filter depends on the student reading their own `level`.
DROP POLICY IF EXISTS "Students can view own memberships" ON public.classroom_memberships;
CREATE POLICY "Students can view own memberships"
    ON public.classroom_memberships FOR SELECT
    USING ((SELECT auth.uid()) = student_id);
