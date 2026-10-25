-- public_profiles keeps definer semantics on purpose (see 20260815100000): signed-in
-- players read each other through it. Logged-out callers, though, could list every
-- profile, children included, with names and last_seen_at. For anon the view now
-- hides anyone on a class roster or with a parental-consent record, and anon loses
-- last_seen_at. Signed-in reads (guest students included) are unchanged.
create or replace view public.public_profiles as
select
    p.id,
    p.username,
    p.avatar_emoji,
    p.avatar_color,
    p.avatar_image,
    p.avatar_config,
    p.player_title,
    p.current_level,
    p.prestige_level,
    p.total_games,
    p.total_score,
    p.total_words,
    p.casual_wins,
    p.ranked_games,
    p.ranked_wins,
    p.ranked_mmr,
    p.peak_mmr,
    p.longest_word,
    p.longest_word_length,
    p.unique_days_played,
    p.display_name,
    p.last_seen_at
from public.profiles p
where current_user <> 'anon'
   or (
     not exists (select 1 from public.classroom_memberships m where m.student_id = p.id)
     and not exists (select 1 from public.parental_consents pc where pc.user_id = p.id)
   );

comment on view public.public_profiles is
    'Safe public projection of public.profiles. Definer semantics BY DESIGN: public.profiles is own-row-only under RLS, so every cross-player read (friends, search, head-to-head, DM threads, leaderboards) goes through here. Do not set security_invoker = on. Logged-out (anon) reads exclude classroom students and consent-tracked minors and get no last_seen_at.';

revoke all on public.public_profiles from anon;
grant select (
    id,
    username,
    avatar_emoji,
    avatar_color,
    avatar_image,
    avatar_config,
    player_title,
    current_level,
    prestige_level,
    total_games,
    total_score,
    total_words,
    casual_wins,
    ranked_games,
    ranked_wins,
    ranked_mmr,
    peak_mmr,
    longest_word,
    longest_word_length,
    unique_days_played,
    display_name
) on public.public_profiles to anon;

revoke all on public.public_profiles from authenticated;
grant select on public.public_profiles to authenticated;
