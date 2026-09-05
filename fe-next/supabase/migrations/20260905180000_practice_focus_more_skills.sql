-- Migration: 20260905180000_practice_focus_more_skills.sql
-- Description: Two vocabulary skills a middle-school ELA teacher asked for by
--   name and that nothing covered — multiple-meaning words and roots/affixes —
--   become pinnable on an assignment alongside the existing four.
-- Idempotent: safe to re-run.
--
-- Widens the `*_practice_focus_check` CHECK created by
-- 20260905140000_assignment_practice_focus.sql on BOTH assignment tables
-- (`teacher_assignments` and the older `lesson_assignments` the app's
-- create/read helpers actually write to). Same DO-block shape as that
-- migration, so re-running either one leaves the same authoritative set.
--
-- The per-word data these skills read (`meanings`, `morphology`) lives inside
-- the schemaless `vocabulary_lessons.words` JSONB — no column change needed.
--
-- The focus a student actually practises is stored in
-- `practice_sessions.results` (JSONB, unconstrained), so no CHECK there needs
-- widening for these values.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['teacher_assignments', 'lesson_assignments'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      -- The column is created by 20260905140000; add it defensively so this
      -- migration also stands alone on a database that skipped ahead.
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'practice_focus'
      ) THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN practice_focus TEXT', tbl);
      END IF;

      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', tbl, tbl || '_practice_focus_check');
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (practice_focus IS NULL OR practice_focus IN (''any'', ''definition'', ''synonym'', ''antonym'', ''context'', ''multiple_meaning'', ''roots_affixes''))',
        tbl, tbl || '_practice_focus_check'
      );

      EXECUTE format(
        'COMMENT ON COLUMN public.%I.practice_focus IS %L',
        tbl,
        'Vocabulary skill the teacher wants drilled: any | definition | synonym | antonym | context | multiple_meaning | roots_affixes. NULL = not specified (treated as any).'
      );
    END IF;
  END LOOP;
END $$;

-- Ask PostgREST to pick up the widened constraint immediately (see 20260126120000).
NOTIFY pgrst, 'reload schema';
