-- Migration: 20260905140000_assignment_practice_focus.sql
-- Description: Teachers can pin ONE vocabulary skill on an assignment
--   (definition matching / synonyms / antonyms / context clues), and students
--   can record targeted `vocab_focus` practice sessions.
-- Idempotent: safe to re-run.
--
-- Two assignment tables exist: `teacher_assignments` (20260215100000) and the
-- older `lesson_assignments` (056) that the app's create/read helpers actually
-- write to. The column goes on BOTH so either path carries the focus.

-- ============================================
-- 1. practice_focus on assignment tables
-- ============================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['teacher_assignments', 'lesson_assignments'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'practice_focus'
      ) THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN practice_focus TEXT', tbl);
      END IF;

      -- (Re)create the CHECK so the allowed set is authoritative here.
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', tbl, tbl || '_practice_focus_check');
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (practice_focus IS NULL OR practice_focus IN (''any'', ''definition'', ''synonym'', ''antonym'', ''context''))',
        tbl, tbl || '_practice_focus_check'
      );

      EXECUTE format(
        'COMMENT ON COLUMN public.%I.practice_focus IS %L',
        tbl,
        'Vocabulary skill the teacher wants drilled: any | definition | synonym | antonym | context. NULL = not specified (treated as any).'
      );
    END IF;
  END LOOP;
END $$;

-- ============================================
-- 2. practice_sessions.practice_type accepts 'vocab_focus'
--    Migration 058 created an inline CHECK with only the original four modes.
--    Rebuild it (whatever its current name) with every mode the app writes.
-- ============================================
DO $$
DECLARE
  con RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'practice_sessions') THEN
    FOR con IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'practice_sessions'
        AND c.contype = 'c'
        AND pg_get_constraintdef(c.oid) ILIKE '%practice_type%'
    LOOP
      EXECUTE format('ALTER TABLE public.practice_sessions DROP CONSTRAINT %I', con.conname);
    END LOOP;

    ALTER TABLE public.practice_sessions
      ADD CONSTRAINT practice_sessions_practice_type_check
      CHECK (
        practice_type IS NULL OR practice_type IN (
          'flashcard', 'solo_board', 'warmup', 'word_list',
          'matching', 'spelling', 'blitz', 'vocab_focus'
        )
      );
  END IF;
END $$;

-- Ask PostgREST to pick up the new column immediately (see 20260126120000).
NOTIFY pgrst, 'reload schema';
