-- Fix RLS initplan on quest_achievement_feed:
-- auth.role() was evaluated per-row (expensive on large tables).
-- Wrapping in (select ...) makes Postgres treat it as an InitPlan — evaluated ONCE per query.
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
DROP POLICY IF EXISTS "Quest feed readable by authenticated" ON public.quest_achievement_feed;
CREATE POLICY "Quest feed readable by authenticated" ON public.quest_achievement_feed
  FOR SELECT USING ((select auth.role()) = 'authenticated');

-- Add missing FK index on word_clubs(owner_id).
-- Flagged by Supabase performance advisor (word_clubs_owner_id_fkey without covering index).
-- Speeds up JOIN lookups and CASCADE operations on the owner relationship.
CREATE INDEX IF NOT EXISTS idx_word_clubs_owner_id ON public.word_clubs(owner_id);
