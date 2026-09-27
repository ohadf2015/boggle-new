-- Word Tower: async wrecking-ball raid queue.
-- An attacker spends a charge to wreck a leaderboard rival; the hit is queued
-- here and applied (session-only, never the protected best_*) when the DEFENDER
-- next starts a climb.
-- NOTE: intentionally NOT added to the supabase_realtime publication — it is
-- consumed by a read on session start, with no realtime subscriber, per the
-- CLAUDE.md realtime-publication rule.
create table if not exists public.word_tower_pending_wrecks (
  id uuid primary key default gen_random_uuid(),
  attacker_id uuid not null references auth.users(id) on delete cascade,
  defender_id uuid not null references auth.users(id) on delete cascade,
  attacker_name text,
  damage_floors int not null default 1,
  reason text,
  created_at timestamptz not null default now(),
  applied_at timestamptz
);

-- Defender's unapplied inbox — the hot path read on every session start.
create index if not exists idx_wt_pending_wrecks_defender_open
  on public.word_tower_pending_wrecks (defender_id)
  where applied_at is null;

alter table public.word_tower_pending_wrecks enable row level security;

-- Both parties can read the row (defender sees their inbox; attacker sees sent).
drop policy if exists "wtw_select_party" on public.word_tower_pending_wrecks;
create policy "wtw_select_party" on public.word_tower_pending_wrecks
  for select using (auth.uid() = defender_id or auth.uid() = attacker_id);

-- Attacker may enqueue a wreck against someone else (never self).
drop policy if exists "wtw_insert_attacker" on public.word_tower_pending_wrecks;
create policy "wtw_insert_attacker" on public.word_tower_pending_wrecks
  for insert with check (auth.uid() = attacker_id and attacker_id <> defender_id);

-- Marking applied is server-only (service role); no client update/delete.
drop policy if exists "wtw_no_client_update" on public.word_tower_pending_wrecks;
create policy "wtw_no_client_update" on public.word_tower_pending_wrecks
  for update using (false) with check (false);

drop policy if exists "wtw_no_client_delete" on public.word_tower_pending_wrecks;
create policy "wtw_no_client_delete" on public.word_tower_pending_wrecks
  for delete using (false);
