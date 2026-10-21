-- Prod drift follow-up to #1381.
--
-- brain_score_history: 029 declared updated_at inside CREATE TABLE IF NOT EXISTS.
-- The table already existed without that column, so the create was a no-op, but
-- trigger brain_score_history_updated_at still landed and assigns NEW.updated_at.
-- Every same-day upsert (ON CONFLICT DO UPDATE) then 400s with
-- record "new" has no field "updated_at". drill_progress has the column; this
-- was the only table that trigger touched which did not.
--
-- increment_profile_stats: backend/routes/dailyChallenge/profileStats.ts calls
-- rpc(p_user_id uuid, p_score integer, p_games integer) via the service-role
-- client. The function was never created, so every daily submit 404s and falls
-- back to a racy read-modify-write.
--
-- Not created here, on purpose:
--   daily_puzzle_streaks — the live caller selected completed_dates, which 015
--     does not have, and nothing writes the table. /api/daily/status derives
--     longest from the attempt rows it already fetched.
--   event_participants — prod already has event_participation with event_id and
--     user_id. The route was querying a name that was never created.

alter table public.brain_score_history
  add column if not exists updated_at timestamptz default now();

comment on column public.brain_score_history.updated_at is
  'Maintained by trigger brain_score_history_updated_at. Column added after the trigger; CREATE TABLE IF NOT EXISTS never backfilled it.';

create or replace function public.increment_profile_stats(
  p_user_id uuid,
  p_score integer,
  p_games integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service-role backend calls have auth.uid() null and may bump any profile.
  -- A browser session, if this execute grant is ever widened, may only bump itself.
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'profile stats can only be incremented for the calling user'
      using errcode = '42501';
  end if;

  update public.profiles
  set
    total_score = coalesce(total_score, 0) + coalesce(p_score, 0),
    total_games = coalesce(total_games, 0) + coalesce(p_games, 0)
  where id = p_user_id;
end;
$$;

revoke all on function public.increment_profile_stats(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.increment_profile_stats(uuid, integer, integer) to service_role;

notify pgrst, 'reload schema';
