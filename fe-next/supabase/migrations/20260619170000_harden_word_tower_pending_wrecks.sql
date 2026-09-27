-- Security hardening for the async wrecking-ball queue (push-review findings).
-- 1) Server is the SOLE writer: client direct-INSERT is removed so every wreck
--    must go through the API's server-authoritative recompute path (the API
--    uses the service-role client, which bypasses RLS). This stops a forged
--    direct insert from spoofing damage_floors / attacker_name.
-- 2) Defense-in-depth CHECK so damage can never exceed the design cap
--    (WRECK_MAX_FLOORS_PER_ATTACK = 4), even via the service role.
-- 3) Anti-pile-on: at most ONE unapplied wreck per (attacker, defender) pair.

-- (1) Lock down client inserts — replace the attacker-insert policy with deny.
drop policy if exists "wtw_insert_attacker" on public.word_tower_pending_wrecks;
drop policy if exists "wtw_no_client_insert" on public.word_tower_pending_wrecks;
create policy "wtw_no_client_insert" on public.word_tower_pending_wrecks
  for insert with check (false);

-- (2) Damage cap as a table invariant.
alter table public.word_tower_pending_wrecks
  drop constraint if exists wtw_damage_floors_range;
alter table public.word_tower_pending_wrecks
  add constraint wtw_damage_floors_range check (damage_floors between 1 and 4);

-- (3) One unapplied wreck per attacker→defender pair (partial unique index).
create unique index if not exists uq_wt_pending_wrecks_open_pair
  on public.word_tower_pending_wrecks (attacker_id, defender_id)
  where applied_at is null;
