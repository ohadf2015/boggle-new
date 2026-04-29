-- Add timer_seconds column to friend_challenges
--
-- Why: backend/modules/friendsChallenges.ts inserts `timer_seconds` from
-- gameSettings.timerSeconds, but the column was never added to the schema.
-- Inserts fail PostgREST schema-cache lookup → all friend-challenge sends error
-- (Sentry JAVASCRIPT-NEXTJS-12F).
--
-- Nullable INTEGER matches the optional pattern of `game_mode`/`game_language`.

ALTER TABLE friend_challenges
  ADD COLUMN IF NOT EXISTS timer_seconds INTEGER;

NOTIFY pgrst, 'reload schema';
