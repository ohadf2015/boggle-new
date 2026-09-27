-- Word Forge meta-progression table.
--
-- Was missing entirely → every POST /api/word-forge/complete failed with
-- PGRST205 ("Could not find the table 'public.word_forge_progress'") and no
-- progress (XP, unlock tier, stats) ever persisted. (Sentry JAVASCRIPT-NEXTJS-1K6)
--
-- Writes go ONLY through the server route using the service-role client; the
-- server owns XP authority (calculateRunXp / getUnlockTier). unlock_tier gates
-- rune content (lib/wordForge/runeCatalog.ts tiers 0-4), so clients MUST NOT be
-- able to write their own row directly — that would let a user self-grant XP
-- and unlock every rune. RLS therefore mirrors the locked-down posture of
-- public.word_tower_progress: read-own only, no client insert/update/delete.
--
-- Idempotent: safe to re-run (table created out-of-band via MCP on 2026-05-30).

create table if not exists public.word_forge_progress (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  total_xp       integer not null default 0,
  unlock_tier    integer not null default 0,
  highest_round  integer not null default 0,
  total_runs     integer not null default 0,
  runs_won       integer not null default 0,
  best_run_score integer not null default 0,
  max_rune_slots integer not null default 5,
  last_played_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.word_forge_progress enable row level security;

-- Read your own row (GET /api/word-forge/progress uses the anon user client).
drop policy if exists wf_select_own on public.word_forge_progress;
create policy wf_select_own on public.word_forge_progress
  for select using ((select auth.uid()) = user_id);

-- Clients may NOT write directly; the completion route uses the service-role
-- client (bypasses RLS). Prevents self-granting total_xp / unlock_tier.
drop policy if exists wf_no_client_insert on public.word_forge_progress;
create policy wf_no_client_insert on public.word_forge_progress
  for insert with check (false);

drop policy if exists wf_no_client_update on public.word_forge_progress;
create policy wf_no_client_update on public.word_forge_progress
  for update using (false);

drop policy if exists wf_no_client_delete on public.word_forge_progress;
create policy wf_no_client_delete on public.word_forge_progress
  for delete using (false);
