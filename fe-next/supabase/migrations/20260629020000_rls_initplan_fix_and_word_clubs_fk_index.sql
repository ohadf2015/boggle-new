-- Fix auth_rls_initplan on quest_achievement_feed:
-- Replace auth.role() with (select auth.role()) so Postgres evaluates it once
-- per query, not once per row. See Supabase docs: call-functions-with-select.
DROP POLICY IF EXISTS "Quest feed readable by authenticated" ON public.quest_achievement_feed;
CREATE POLICY "Quest feed readable by authenticated" ON public.quest_achievement_feed
  FOR SELECT USING ((select auth.role()) = 'authenticated');

-- Add missing FK index on word_clubs.owner_id (Supabase advisor: unindexed_foreign_keys).
-- word_clubs_owner_id_fkey without a covering index causes seq-scan on joins.
CREATE INDEX IF NOT EXISTS idx_word_clubs_owner_id ON public.word_clubs(owner_id);
