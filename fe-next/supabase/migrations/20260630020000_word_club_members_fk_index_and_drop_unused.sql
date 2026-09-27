-- Add missing FK index on word_club_members(user_id).
-- Flagged by Supabase performance advisor (word_club_members_user_id_fkey without covering index).
-- Speeds up JOIN lookups and CASCADE operations, prevents seq-scan on member lookups by user.
CREATE INDEX IF NOT EXISTS idx_word_club_members_user_id ON public.word_club_members(user_id);

-- Drop unused index idx_word_wheel_attempts_catchup on daily_word_wheel_attempts.
-- Flagged by Supabase advisor: idx_scan = 0 (never used in query plans).
-- Removing it reduces write overhead on INSERT/UPDATE/DELETE to this table.
DROP INDEX IF EXISTS public.idx_word_wheel_attempts_catchup;
