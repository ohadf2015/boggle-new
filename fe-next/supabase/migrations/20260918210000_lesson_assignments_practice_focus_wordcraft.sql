-- Word Craft as classroom homework: allow practice_focus = 'wordcraft'.
--
-- lesson_assignments has no mode column; the assignment's mode rides on
-- practice_focus. 'wordcraft' = students play Word Craft solo vs the bot.
-- NULL and 'any' keep their existing meaning (student picks), so legacy rows,
-- the create-lesson-and-assign shortcut and duel assignments are unaffected.
--
-- Previous definition (read from pg_constraint on 2026-09-18):
--   CHECK ((practice_focus IS NULL) OR (practice_focus = ANY (ARRAY['any',
--     'definition','synonym','antonym','context','multiple_meaning','roots_affixes'])))
--
-- Idempotent: drop-if-exists then re-add with the same values plus 'wordcraft'.

ALTER TABLE public.lesson_assignments
  DROP CONSTRAINT IF EXISTS lesson_assignments_practice_focus_check;

ALTER TABLE public.lesson_assignments
  ADD CONSTRAINT lesson_assignments_practice_focus_check
  CHECK (
    practice_focus IS NULL
    OR practice_focus = ANY (ARRAY[
      'any'::text,
      'definition'::text,
      'synonym'::text,
      'antonym'::text,
      'context'::text,
      'multiple_meaning'::text,
      'roots_affixes'::text,
      'wordcraft'::text
    ])
  );
