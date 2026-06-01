-- Word Bridge master puzzle pool — the editable source-of-truth for curated
-- puzzles across all 5 locales. Runtime still loads from a build-time
-- materialized static .ts snapshot (preserves the daily's byte-identical
-- determinism for the leaderboard); this table is where puzzles are authored,
-- reviewed, and edited. A sync script regenerates the static pools from the
-- active rows here. NOT added to supabase_realtime (read on-demand only).

create table if not exists public.connections_puzzles (
  id text primary key,                         -- e.g. 'en-m-001', 'he-h-042', 'ja-e-007'
  locale text not null check (locale in ('en','he','sv','ja','es')),
  word1 text not null,
  bridge text not null,
  word2 text not null,
  accepted_answers text[] not null default '{}',
  hint text,
  -- Real attested compounds shown after the solve ("why it works" teach-moment):
  -- [{ "w1": "...", "bridge": "...", "w2": "..." }] in the puzzle's language.
  examples jsonb not null default '[]'::jsonb,
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  -- Provenance — gates what may enter the active daily pool.
  source text not null default 'authored'
    check (source in ('authored','online','generated','council-seed','ugc')),
  is_active boolean not null default true,
  -- Optional schedule-ahead anchor for future frozen-daily materialization.
  available_from date,
  quality_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists connections_puzzles_active_idx
  on public.connections_puzzles (locale, is_active, difficulty, id);
create index if not exists connections_puzzles_bridge_idx
  on public.connections_puzzles (locale, bridge);

alter table public.connections_puzzles enable row level security;

-- Public (anon + authed) may read ACTIVE puzzles only. All writes flow through
-- service-role API routes / the seed+sync scripts (no anon write policy).
drop policy if exists "connections puzzles active public read" on public.connections_puzzles;
create policy "connections puzzles active public read"
  on public.connections_puzzles for select using (is_active = true);

comment on table public.connections_puzzles is
  'Word Bridge master puzzle pool (5 locales). Source-of-truth for authoring; runtime reads a materialized static snapshot. Service-role writes; public read of active only; NOT in supabase_realtime.';
