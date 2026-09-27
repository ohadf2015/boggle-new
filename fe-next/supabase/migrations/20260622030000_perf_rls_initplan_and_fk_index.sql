-- Perf fixes 2026-06-22 — auth_rls_initplan + unindexed FK.
--
-- 1. Fix auth_rls_initplan on word_tower_pending_wrecks (wtw_select_party).
--    Policy re-evaluates auth.uid() per row scanned. Wrapping in (select auth.uid())
--    promotes it to an initplan: evaluated ONCE per statement, not once per row.
--    Source: Supabase advisor 2026-06-22, perf score 0.125.
--    Reversible: ALTER POLICY "wtw_select_party" ON public.word_tower_pending_wrecks
--      USING (auth.uid() = defender_id OR auth.uid() = attacker_id);
--
-- 2. Re-ensure word_pacts.player2_id index (20260615030000 added it but advisor
--    still flags it — likely unapplied to prod). IF NOT EXISTS = safe no-op if live.
--    Reversible: DROP INDEX IF EXISTS idx_word_pacts_player2_id;

-- 1. Patch wtw_select_party to initplan form.
ALTER POLICY "wtw_select_party" ON public.word_tower_pending_wrecks
  USING ((SELECT auth.uid()) = defender_id OR (SELECT auth.uid()) = attacker_id);

-- 2. Ensure FK index on word_pacts.player2_id.
CREATE INDEX IF NOT EXISTS idx_word_pacts_player2_id
  ON public.word_pacts (player2_id);
