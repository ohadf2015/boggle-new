-- Drop unused index flagged by Supabase performance advisor.
-- `quick_play_challenges_challenger_idx` has zero recorded uses in pg_stat_user_indexes.
-- Unused indexes waste write overhead (every INSERT/UPDATE/DELETE maintains the B-tree)
-- with zero query benefit. Safe to drop; Postgres creates no replacement automatically.
DROP INDEX IF EXISTS public.quick_play_challenges_challenger_idx;

-- Add missing FK index on word_club_members(user_id).
-- Supabase performance advisor flagged word_club_members_user_id_fkey without a covering
-- index. FK lookups and CASCADE-delete operations on this table will Seq Scan the entire
-- table without this index. IF NOT EXISTS = idempotent if already applied via dashboard.
CREATE INDEX IF NOT EXISTS idx_word_club_members_user_id
  ON public.word_club_members(user_id);

-- NOTE: quick_play_challenges.quick_play_challenges_accept RLS initplan fix is DEFERRED.
-- The policy uses auth.<function>() per-row (re-evaluated for every scanned row).
-- Fix requires reading the exact USING clause from pg_policies before rewriting:
--   SELECT polname, pg_get_expr(polqual, polrelid) FROM pg_policy
--   WHERE polrelid = 'public.quick_play_challenges'::regclass;
-- Apply when Supabase MCP is available (mint never-expire PAT — escalated to human).
-- Pattern: replace auth.uid() with (select auth.uid()), auth.role() with (select auth.role()).
