-- Add btree indexes for 16 unindexed foreign-key columns surfaced by
-- the performance advisor. Postgres does not auto-index FK columns
-- (only the referenced PK side), so DELETE on the parent / JOIN on
-- the child both fall back to seq scans without these.

CREATE INDEX IF NOT EXISTS community_words_first_approved_by_idx ON public.community_words(first_approved_by);
CREATE INDEX IF NOT EXISTS player_words_first_submitted_by_idx ON public.player_words(first_submitted_by);
CREATE INDEX IF NOT EXISTS player_words_last_submitted_by_idx ON public.player_words(last_submitted_by);
CREATE INDEX IF NOT EXISTS community_board_ratings_player_id_idx ON public.community_board_ratings(player_id);
CREATE INDEX IF NOT EXISTS community_board_reports_reporter_id_idx ON public.community_board_reports(reporter_id);
CREATE INDEX IF NOT EXISTS web_vitals_player_id_idx ON public.web_vitals(player_id);
CREATE INDEX IF NOT EXISTS drill_sessions_user_id_idx ON public.drill_sessions(user_id);
CREATE INDEX IF NOT EXISTS vault_board_scores_player_id_idx ON public.vault_board_scores(player_id);
CREATE INDEX IF NOT EXISTS curriculum_word_lists_created_by_idx ON public.curriculum_word_lists(created_by);
CREATE INDEX IF NOT EXISTS student_achievements_achievement_id_idx ON public.student_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS word_pacts_player2_id_idx ON public.word_pacts(player2_id);
CREATE INDEX IF NOT EXISTS ugc_pack_upvotes_player_id_idx ON public.ugc_pack_upvotes(player_id);
CREATE INDEX IF NOT EXISTS ugc_pack_plays_player_id_idx ON public.ugc_pack_plays(player_id);
CREATE INDEX IF NOT EXISTS ugc_pack_reports_reporter_id_idx ON public.ugc_pack_reports(reporter_id);
CREATE INDEX IF NOT EXISTS word_review_state_lesson_id_idx ON public.word_review_state(lesson_id);
CREATE INDEX IF NOT EXISTS connections_feedback_user_id_idx ON public.connections_feedback(user_id);
