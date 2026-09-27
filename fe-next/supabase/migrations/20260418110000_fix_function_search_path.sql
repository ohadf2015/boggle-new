-- Pin search_path on all flagged functions (supabase advisor 0011).
-- Prevents search_path hijack on SECURITY DEFINER functions and makes
-- non-definer functions deterministic across callers.

ALTER FUNCTION public.admin_activity_stats()                                                         SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_bulk_ban_players(p_player_ids uuid[], p_reason text, p_admin_id uuid)    SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_cohort_retention(weeks integer)                                          SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_engagement_funnel()                                                      SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_language_breakdown()                                                     SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_overview_stats()                                                         SET search_path = public, pg_temp;
ALTER FUNCTION public.auto_generate_join_code()                                                      SET search_path = public, pg_temp;
ALTER FUNCTION public.block_word_bank_word(p_word text, p_language text, p_admin_id uuid, p_reason text) SET search_path = public, pg_temp;
ALTER FUNCTION public.decrement_pack_upvote(pack_id uuid)                                            SET search_path = public, pg_temp;
ALTER FUNCTION public.dismiss_all_notifications()                                                    SET search_path = public, pg_temp;
ALTER FUNCTION public.expire_stale_friend_requests()                                                 SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_join_code()                                                           SET search_path = public, pg_temp;
ALTER FUNCTION public.get_auto_promotion_candidates(p_min_submissions integer, p_limit integer)      SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_pack_play(pack_id uuid)                                              SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_pack_upvote(pack_id uuid)                                            SET search_path = public, pg_temp;
ALTER FUNCTION public.mark_word_auto_promoted(p_word_id uuid, p_source text)                         SET search_path = public, pg_temp;
ALTER FUNCTION public.mark_word_bank_used(p_word text, p_language text)                              SET search_path = public, pg_temp;
ALTER FUNCTION public.prevent_direct_xp_update()                                                     SET search_path = public, pg_temp;
ALTER FUNCTION public.process_gift(p_sender_id uuid, p_recipient_id uuid, p_gift_type text, p_amount integer, p_cost integer, p_xp integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.unblock_word_bank_word(p_word text, p_language text)                           SET search_path = public, pg_temp;
ALTER FUNCTION public.update_lesson_template_updated_at()                                            SET search_path = public, pg_temp;
ALTER FUNCTION public.update_student_level()                                                         SET search_path = public, pg_temp;
ALTER FUNCTION public.update_teacher_assignment_updated_at()                                         SET search_path = public, pg_temp;
