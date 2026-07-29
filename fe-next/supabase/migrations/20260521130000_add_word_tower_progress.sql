-- Word Tower Phase 2: per-player persistence (resume + leaderboard).
-- Applied to remote via Supabase MCP; this file mirrors it for repo history.
create table if not exists public.word_tower_progress (
  player_id uuid primary key references auth.users(id) on delete cascade,
  best_height_m numeric not null default 0,
  best_floors int not null default 0,
  current_height_m numeric not null default 0,
  current_floors int not null default 0,
  current_state jsonb,
  total_floors_built bigint not null default 0,
  longest_combo int not null default 0,
  longest_word text,
  highest_biome text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_word_tower_progress_best_height
  on public.word_tower_progress (best_height_m desc);

-- Monotonic guard: best_* / totals can never regress on update.
create or replace function public.word_tower_progress_monotonic()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.best_height_m := greatest(coalesce(new.best_height_m, 0), old.best_height_m);
  new.best_floors := greatest(coalesce(new.best_floors, 0), old.best_floors);
  new.longest_combo := greatest(coalesce(new.longest_combo, 0), old.longest_combo);
  new.total_floors_built := greatest(coalesce(new.total_floors_built, 0), old.total_floors_built);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_word_tower_progress_monotonic on public.word_tower_progress;
create trigger trg_word_tower_progress_monotonic
  before update on public.word_tower_progress
  for each row execute function public.word_tower_progress_monotonic();

alter table public.word_tower_progress enable row level security;

drop policy if exists "wt_select_own" on public.word_tower_progress;
create policy "wt_select_own" on public.word_tower_progress
  for select using (auth.uid() = player_id);

drop policy if exists "wt_update_own" on public.word_tower_progress;
create policy "wt_update_own" on public.word_tower_progress
  for update using (auth.uid() = player_id) with check (auth.uid() = player_id);

drop policy if exists "wt_no_client_insert" on public.word_tower_progress;
create policy "wt_no_client_insert" on public.word_tower_progress
  for insert with check (false);

drop policy if exists "wt_no_delete" on public.word_tower_progress;
create policy "wt_no_delete" on public.word_tower_progress
  for delete using (false);
