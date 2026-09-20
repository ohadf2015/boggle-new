-- Word Tower v2 empire: per-player estate + raid log.
-- Additive only. v1's word_tower_progress / word_tower_pending_wrecks are NOT
-- touched (v1 is public and owns those rows).
-- NOT added to supabase_realtime: read by API routes only, no postgres_changes
-- consumer (see .claude/rules/50-supabase-perf.md).
-- Every number is computed server-side from lib/wordTowerV2/estate.ts; clients
-- can only SELECT their own rows. All writes go through the service role.

create table if not exists public.word_tower_estates (
  player_id uuid primary key references auth.users(id) on delete cascade,
  coins bigint not null default 0 check (coins >= 0),
  district int not null default 1 check (district between 1 and 10),
  plots jsonb not null default '[]'::jsonb,
  shields int not null default 0 check (shields between 0 and 5),
  bricks int not null default 0 check (bricks between 0 and 99),
  blueprints int not null default 0 check (blueprints between 0 and 99),
  raid_charges int not null default 0 check (raid_charges between 0 and 3),
  last_tower jsonb not null default '[]'::jsonb,
  best_m numeric not null default 0 check (best_m >= 0),
  runs int not null default 0 check (runs >= 0),
  updated_at timestamptz not null default now()
);

-- Rival matchmaking: estates near yours by district, then best height.
create index if not exists idx_wt_estates_district_best
  on public.word_tower_estates (district, best_m);

create table if not exists public.word_tower_raids (
  id uuid primary key default gen_random_uuid(),
  attacker_id uuid not null references auth.users(id) on delete cascade,
  defender_id uuid not null references auth.users(id) on delete cascade,
  district int not null,
  plot text,
  blocked boolean not null default false,
  coins_stolen int not null default 0 check (coins_stolen >= 0),
  attacker_coins int not null default 0 check (attacker_coins >= 0),
  revenge boolean not null default false,
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  avenged_at timestamptz,
  check (attacker_id <> defender_id)
);

-- Defender's unseen inbox (GET /estate) and revenge list (GET /rivals).
create index if not exists idx_wt_raids_defender_unseen
  on public.word_tower_raids (defender_id, created_at desc)
  where seen_at is null;
create index if not exists idx_wt_raids_defender_unavenged
  on public.word_tower_raids (defender_id, created_at desc)
  where avenged_at is null;
create index if not exists idx_wt_raids_attacker
  on public.word_tower_raids (attacker_id);

alter table public.word_tower_estates enable row level security;
alter table public.word_tower_raids enable row level security;

drop policy if exists "wte_select_own" on public.word_tower_estates;
create policy "wte_select_own" on public.word_tower_estates
  for select using ((select auth.uid()) = player_id);
drop policy if exists "wte_no_client_insert" on public.word_tower_estates;
create policy "wte_no_client_insert" on public.word_tower_estates
  for insert with check (false);
drop policy if exists "wte_no_client_update" on public.word_tower_estates;
create policy "wte_no_client_update" on public.word_tower_estates
  for update using (false) with check (false);
drop policy if exists "wte_no_client_delete" on public.word_tower_estates;
create policy "wte_no_client_delete" on public.word_tower_estates
  for delete using (false);

drop policy if exists "wtr_select_party" on public.word_tower_raids;
create policy "wtr_select_party" on public.word_tower_raids
  for select using ((select auth.uid()) = defender_id or (select auth.uid()) = attacker_id);
drop policy if exists "wtr_no_client_insert" on public.word_tower_raids;
create policy "wtr_no_client_insert" on public.word_tower_raids
  for insert with check (false);
drop policy if exists "wtr_no_client_update" on public.word_tower_raids;
create policy "wtr_no_client_update" on public.word_tower_raids
  for update using (false) with check (false);
drop policy if exists "wtr_no_client_delete" on public.word_tower_raids;
create policy "wtr_no_client_delete" on public.word_tower_raids
  for delete using (false);

-- Apply a raid atomically: both estate rows are locked, the outcome computed by
-- the route (pure raidOutcome) is applied as DELTAS, and the log row inserted.
-- Raises 'no_charges' | 'no_defender' | 'stale_shield' | 'no_revenge' so the
-- route can map them; any raise rolls the whole thing back.
create or replace function public.word_tower_apply_raid(
  p_attacker uuid,
  p_defender uuid,
  p_district int,
  p_slot text,
  p_blocked boolean,
  p_coins_stolen int,
  p_attacker_coins int,
  p_revenge_raid_id uuid
) returns table (out_raid_id uuid, out_coins_stolen int, out_attacker_coins int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_att public.word_tower_estates%rowtype;
  v_def public.word_tower_estates%rowtype;
  v_stolen int;
  v_gain int;
  v_id uuid;
begin
  -- Lock in a fixed order (by id) so two players raiding each other can't deadlock.
  if p_attacker < p_defender then
    select * into v_att from public.word_tower_estates where player_id = p_attacker for update;
    select * into v_def from public.word_tower_estates where player_id = p_defender for update;
  else
    select * into v_def from public.word_tower_estates where player_id = p_defender for update;
    select * into v_att from public.word_tower_estates where player_id = p_attacker for update;
  end if;

  if v_att.player_id is null or v_att.raid_charges < 1 then
    raise exception 'no_charges';
  end if;
  if v_def.player_id is null then
    raise exception 'no_defender';
  end if;
  -- The outcome was computed from a snapshot; a shield gained/lost since then flips it.
  if p_blocked <> (v_def.shields > 0) then
    raise exception 'stale_shield';
  end if;

  v_stolen := least(greatest(p_coins_stolen, 0), v_def.coins)::int;
  v_gain := greatest(p_attacker_coins - (greatest(p_coins_stolen, 0) - v_stolen), 0);

  if p_blocked then
    update public.word_tower_estates
      set shields = shields - 1, updated_at = now()
      where player_id = p_defender;
  else
    update public.word_tower_estates
      set coins = coins - v_stolen,
          plots = case when p_slot is null then plots else (
            select coalesce(jsonb_agg(
              case when e->>'slot' = p_slot then jsonb_set(e, '{damaged}', 'true'::jsonb) else e end
              order by ord), '[]'::jsonb)
            from jsonb_array_elements(plots) with ordinality as t(e, ord)
          ) end,
          updated_at = now()
      where player_id = p_defender;
  end if;

  update public.word_tower_estates
    set coins = coins + v_gain, raid_charges = raid_charges - 1, updated_at = now()
    where player_id = p_attacker;

  if p_revenge_raid_id is not null then
    update public.word_tower_raids
      set avenged_at = now()
      where id = p_revenge_raid_id
        and attacker_id = p_defender
        and defender_id = p_attacker
        and avenged_at is null;
    if not found then
      raise exception 'no_revenge';
    end if;
  end if;

  insert into public.word_tower_raids
    (attacker_id, defender_id, district, plot, blocked, coins_stolen, attacker_coins, revenge)
  values
    (p_attacker, p_defender, p_district, case when p_blocked then null else p_slot end,
     p_blocked, case when p_blocked then 0 else v_stolen end, v_gain, p_revenge_raid_id is not null)
  returning id into v_id;

  return query select v_id, case when p_blocked then 0 else v_stolen end, v_gain;
end;
$$;

revoke all on function public.word_tower_apply_raid(uuid, uuid, int, text, boolean, int, int, uuid) from public, anon, authenticated;
grant execute on function public.word_tower_apply_raid(uuid, uuid, int, text, boolean, int, int, uuid) to service_role;
