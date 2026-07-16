-- Supabase advisor: table `public.word_pacts` has foreign key
-- `word_pacts_player2_id_fkey` without a covering index. Every JOIN or
-- WHERE clause on player2_id triggers a Seq Scan on the full table.
-- CONCURRENTLY: zero table lock, safe on a live instance.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_word_pacts_player2_id
  ON public.word_pacts (player2_id);
