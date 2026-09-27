-- Word Tower v2: revenge costs no raid charge.
--
-- Charges are banked one per run, so charging for payback meant "someone
-- wrecked your tower — now go play a round before you may answer". The bar
-- (Coin Master) keeps revenge actionable with nothing banked; that is the
-- return hook. Here the un-avenged raid row IS the charge: this function
-- flips its `avenged_at` in the same transaction it applies the hit, so one
-- incoming raid buys exactly one free swing back and no client can mint them.
--
-- Only two lines differ from 20260919200000_word_tower_estates.sql:
--   * the charge check is waived when p_revenge_raid_id is present
--   * the attacker's charge is spent only on an ordinary raid
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

  if v_att.player_id is null or (v_att.raid_charges < 1 and p_revenge_raid_id is null) then
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
    set coins = coins + v_gain,
        raid_charges = case when p_revenge_raid_id is null then raid_charges - 1 else raid_charges end,
        updated_at = now()
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
