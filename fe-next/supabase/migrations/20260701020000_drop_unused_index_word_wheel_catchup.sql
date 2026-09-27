-- Drop unused index on daily_word_wheel_attempts.
-- Supabase advisor: idx_word_wheel_attempts_catchup has never been used.
-- Unused indexes add write overhead on every INSERT/UPDATE/DELETE with no query benefit.
-- Safe: IF EXISTS guard; no query references this index (advisor usage_count = 0).
DROP INDEX IF EXISTS public.idx_word_wheel_attempts_catchup;
