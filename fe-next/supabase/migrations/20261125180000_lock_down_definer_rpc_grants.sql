-- Server-only SECURITY DEFINER RPCs (several take any user id + amount): service_role only.
-- Policy helpers and RPCs called with a user's JWT (guest students included) stay granted.

revoke execute on function public.add_league_xp(uuid, integer) from public, anon, authenticated;
grant execute on function public.add_league_xp(uuid, integer) to service_role;
revoke execute on function public.admin_activity_stats() from public, anon, authenticated;
grant execute on function public.admin_activity_stats() to service_role;
revoke execute on function public.admin_bulk_ban_players(uuid[], text, uuid) from public, anon, authenticated;
grant execute on function public.admin_bulk_ban_players(uuid[], text, uuid) to service_role;
revoke execute on function public.admin_cohort_retention(integer) from public, anon, authenticated;
grant execute on function public.admin_cohort_retention(integer) to service_role;
revoke execute on function public.admin_engagement_funnel() from public, anon, authenticated;
grant execute on function public.admin_engagement_funnel() to service_role;
revoke execute on function public.admin_language_breakdown() from public, anon, authenticated;
grant execute on function public.admin_language_breakdown() to service_role;
revoke execute on function public.admin_overview_stats() from public, anon, authenticated;
grant execute on function public.admin_overview_stats() to service_role;
revoke execute on function public.anonymize_season_leaderboards_on_profile_delete() from public, anon, authenticated;
grant execute on function public.anonymize_season_leaderboards_on_profile_delete() to service_role;
revoke execute on function public.auto_remediate_realtime_publication() from public, anon, authenticated;
grant execute on function public.auto_remediate_realtime_publication() to service_role;
revoke execute on function public.award_ad_coins(uuid, integer, text, jsonb, integer) from public, anon, authenticated;
grant execute on function public.award_ad_coins(uuid, integer, text, jsonb, integer) to service_role;
revoke execute on function public.award_coins(uuid, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.award_coins(uuid, integer, text, jsonb) to service_role;
revoke execute on function public.block_word_bank_word(text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.block_word_bank_word(text, text, uuid, text) to service_role;
revoke execute on function public.bulk_update_word_bank_validation(uuid[], text) from public, anon, authenticated;
grant execute on function public.bulk_update_word_bank_validation(uuid[], text) to service_role;
revoke execute on function public.can_access_feature_flag(uuid, character varying) from public, anon, authenticated;
grant execute on function public.can_access_feature_flag(uuid, character varying) to service_role;
revoke execute on function public.claim_boost(uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_boost(uuid, text, text) to service_role;
revoke execute on function public.claim_season_rewards(uuid, integer, integer, text[]) from public, anon, authenticated;
grant execute on function public.claim_season_rewards(uuid, integer, integer, text[]) to service_role;
revoke execute on function public.cleanup_deleted_messages() from public, anon, authenticated;
grant execute on function public.cleanup_deleted_messages() to service_role;
revoke execute on function public.decrement_pack_upvote(uuid) from public, anon, authenticated;
grant execute on function public.decrement_pack_upvote(uuid) to service_role;
revoke execute on function public.expire_old_challenges() from public, anon, authenticated;
grant execute on function public.expire_old_challenges() to service_role;
revoke execute on function public.expire_stale_friend_requests() from public, anon, authenticated;
grant execute on function public.expire_stale_friend_requests() to service_role;
revoke execute on function public.generate_referral_code() from public, anon, authenticated;
grant execute on function public.generate_referral_code() to service_role;
revoke execute on function public.get_active_prompt_template(character varying, character varying) from public, anon, authenticated;
grant execute on function public.get_active_prompt_template(character varying, character varying) to service_role;
revoke execute on function public.get_milog_verification_queue(integer, integer, integer) from public, anon, authenticated;
grant execute on function public.get_milog_verification_queue(integer, integer, integer) to service_role;
revoke execute on function public.get_milog_verified_words(integer) from public, anon, authenticated;
grant execute on function public.get_milog_verified_words(integer) to service_role;
revoke execute on function public.get_or_create_default_template(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_or_create_default_template(uuid, uuid) to service_role;
revoke execute on function public.get_or_create_difficulty(uuid, text) from public, anon, authenticated;
grant execute on function public.get_or_create_difficulty(uuid, text) to service_role;
revoke execute on function public.get_or_create_player_rating(uuid) from public, anon, authenticated;
grant execute on function public.get_or_create_player_rating(uuid) to service_role;
revoke execute on function public.get_random_words_from_bank(text, integer, text[], integer) from public, anon, authenticated;
grant execute on function public.get_random_words_from_bank(text, integer, text[], integer) to service_role;
revoke execute on function public.get_unjudged_bank_words(text, integer) from public, anon, authenticated;
grant execute on function public.get_unjudged_bank_words(text, integer) to service_role;
revoke execute on function public.get_user_age_from_consent(uuid) from public, anon, authenticated;
grant execute on function public.get_user_age_from_consent(uuid) to service_role;
revoke execute on function public.grant_offerwall_coins(text, uuid, integer, numeric, boolean, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.grant_offerwall_coins(text, uuid, integer, numeric, boolean, text, text, text, jsonb) to service_role;
revoke execute on function public.increment_bot_word_usage(text, text) from public, anon, authenticated;
grant execute on function public.increment_bot_word_usage(text, text) to service_role;
revoke execute on function public.increment_ghost_rival_score(uuid, date, integer) from public, anon, authenticated;
grant execute on function public.increment_ghost_rival_score(uuid, date, integer) to service_role;
revoke execute on function public.increment_pack_play(uuid) from public, anon, authenticated;
grant execute on function public.increment_pack_play(uuid) to service_role;
revoke execute on function public.increment_pack_upvote(uuid) from public, anon, authenticated;
grant execute on function public.increment_pack_upvote(uuid) to service_role;
revoke execute on function public.increment_profile_xp(uuid, integer) from public, anon, authenticated;
grant execute on function public.increment_profile_xp(uuid, integer) to service_role;
revoke execute on function public.mark_word_bank_used(text, text) from public, anon, authenticated;
grant execute on function public.mark_word_bank_used(text, text) to service_role;
revoke execute on function public.mark_word_promoted_to_dictionary(uuid) from public, anon, authenticated;
grant execute on function public.mark_word_promoted_to_dictionary(uuid) to service_role;
revoke execute on function public.process_season_reset(integer) from public, anon, authenticated;
grant execute on function public.process_season_reset(integer) to service_role;
revoke execute on function public.purchase_collectible(uuid, text) from public, anon, authenticated;
grant execute on function public.purchase_collectible(uuid, text) to service_role;
revoke execute on function public.recompute_current_season_leaderboard(uuid) from public, anon, authenticated;
grant execute on function public.recompute_current_season_leaderboard(uuid) to service_role;
revoke execute on function public.record_invalid_word_submission(text, text, text) from public, anon, authenticated;
grant execute on function public.record_invalid_word_submission(text, text, text) to service_role;
revoke execute on function public.record_level_attempt(uuid, integer, integer, integer, integer, integer, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.record_level_attempt(uuid, integer, integer, integer, integer, integer, jsonb, boolean) to service_role;
revoke execute on function public.record_player_wrong_word(text, text) from public, anon, authenticated;
grant execute on function public.record_player_wrong_word(text, text) to service_role;
revoke execute on function public.record_word_appeal(text, text) from public, anon, authenticated;
grant execute on function public.record_word_appeal(text, text) to service_role;
revoke execute on function public.record_word_mastery_event(uuid, text, text, text, boolean, integer) from public, anon, authenticated;
grant execute on function public.record_word_mastery_event(uuid, text, text, text, boolean, integer) to service_role;
revoke execute on function public.reset_weekly_club_xp() from public, anon, authenticated;
grant execute on function public.reset_weekly_club_xp() to service_role;
revoke execute on function public.school_lead_rate_limited(text) from public, anon, authenticated;
grant execute on function public.school_lead_rate_limited(text) to service_role;
revoke execute on function public.snapshot_db_perf_top_queries() from public, anon, authenticated;
grant execute on function public.snapshot_db_perf_top_queries() to service_role;
revoke execute on function public.snapshot_realtime_publication() from public, anon, authenticated;
grant execute on function public.snapshot_realtime_publication() to service_role;
revoke execute on function public.sync_coins(uuid, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.sync_coins(uuid, integer, text, jsonb) to service_role;
revoke execute on function public.unblock_word_bank_word(text, text) from public, anon, authenticated;
grant execute on function public.unblock_word_bank_word(text, text) to service_role;
revoke execute on function public.update_buzz_streak(uuid, date) from public, anon, authenticated;
grant execute on function public.update_buzz_streak(uuid, date) to service_role;
revoke execute on function public.update_difficulty_after_game(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.update_difficulty_after_game(uuid, text, boolean) to service_role;

-- Both return early without auth.uid(), so logged-out callers lose nothing.
revoke execute on function public.bump_vocabulary_lesson_stat(uuid, text) from public, anon;
grant execute on function public.bump_vocabulary_lesson_stat(uuid, text) to authenticated, service_role;
revoke execute on function public.report_vocabulary_lesson(uuid, text, text) from public, anon;
grant execute on function public.report_vocabulary_lesson(uuid, text, text) to authenticated, service_role;

create or replace function public.get_web_vitals_stats(time_range_minutes integer default 1440)
 returns table(metric_name text, avg_value numeric, p75_value numeric, p95_value numeric, good_count bigint, needs_improvement_count bigint, poor_count bigint, total_count bigint)
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
begin
  if not public.is_admin_user() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  return query
  with filtered_metrics as (
    select wv.metric_name, wv.metric_value, wv.metric_rating
    from web_vitals wv
    where wv.created_at >= now() - (time_range_minutes || ' minutes')::interval
  )
  select
    fm.metric_name,
    avg(fm.metric_value)::numeric as avg_value,
    percentile_cont(0.75) within group (order by fm.metric_value)::numeric as p75_value,
    percentile_cont(0.95) within group (order by fm.metric_value)::numeric as p95_value,
    count(*) filter (where fm.metric_rating = 'good') as good_count,
    count(*) filter (where fm.metric_rating = 'needs-improvement') as needs_improvement_count,
    count(*) filter (where fm.metric_rating = 'poor') as poor_count,
    count(*) as total_count
  from filtered_metrics fm
  group by fm.metric_name
  order by fm.metric_name;
end;
$function$;
revoke execute on function public.get_web_vitals_stats(integer) from public, anon;
grant execute on function public.get_web_vitals_stats(integer) to authenticated, service_role;

-- public_profiles stays a definer view (see 20261025300500): an invoker view over
-- a definer function would scan every profile per lookup. It must never be writable.
revoke insert, update, delete, truncate on public.public_profiles from public, anon, authenticated;

-- The migration runner created _migrations without RLS (advisor rls_disabled_in_public).
do $$
begin
  if to_regclass('public._migrations') is not null then
    revoke all on public._migrations from public, anon, authenticated;
    alter table public._migrations enable row level security;
  end if;
end $$;
