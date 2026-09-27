-- =============================================
-- PRACTICE SESSIONS — index for the teacher "Last class game" card.
-- Migration: 20260905150000_practice_sessions_classroom_game_index
--
-- WHY THIS EXISTS
-- After a live classroom game the backend writes one `practice_sessions` row
-- per student with `results` JSON (`{ gameCode, gameMode, lessonIds,
-- lessonWordsFound, lessonWordsMissed, … }`). The teacher dashboard reads
-- them back as:
--
--   SELECT … FROM practice_sessions
--   WHERE classroom_id = $1 AND results->>'gameCode' IS NOT NULL
--   ORDER BY completed_at DESC LIMIT n;
--
-- The existing (classroom_id, mode) index cannot serve the ORDER BY, so every
-- open of the Review tab would sort the classroom's full history. Solo
-- practice rows (the bulk of the table) have no `results.gameCode`, so a
-- partial index keeps this small.
--
-- Idempotent. Does NOT touch the realtime publication.
-- =============================================

CREATE INDEX IF NOT EXISTS idx_practice_sessions_classroom_game_recent
  ON public.practice_sessions (classroom_id, completed_at DESC)
  WHERE classroom_id IS NOT NULL AND (results->>'gameCode') IS NOT NULL;

COMMENT ON INDEX public.idx_practice_sessions_classroom_game_recent IS
  'Teacher "Last class game" card: newest classroom game rows per classroom (partial: only rows with results.gameCode).';
