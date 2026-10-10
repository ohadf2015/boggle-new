-- Migration: 20261010180000_assignment_word_count_target.sql
-- Description: Teachers can assign a word-count homework (find N words by date)
--   without first building a full lesson. Idempotent.
--
-- Two assignment tables exist: teacher_assignments (20260215100000) and the
-- older lesson_assignments (056) that the app's create/read helpers write to.
-- Column goes on BOTH.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['teacher_assignments', 'lesson_assignments'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'word_count_target'
      ) THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN word_count_target INTEGER', tbl);
      END IF;

      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', tbl, tbl || '_word_count_target_check');
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (word_count_target IS NULL OR (word_count_target >= 1 AND word_count_target <= 100))',
        tbl, tbl || '_word_count_target_check'
      );

      EXECUTE format(
        'COMMENT ON COLUMN public.%I.word_count_target IS %L',
        tbl,
        'When set, students complete this assignment by finding this many unique words. NULL = lesson/list homework.'
      );
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
