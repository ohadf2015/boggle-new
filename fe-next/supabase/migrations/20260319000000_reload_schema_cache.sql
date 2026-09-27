-- Reload PostgREST schema cache after recent table/view additions
-- Fixes: ugc_word_packs, community_board_creator_stats, blast_results,
-- invalid_word_submissions and other tables added since Feb 2026
NOTIFY pgrst, 'reload schema';
