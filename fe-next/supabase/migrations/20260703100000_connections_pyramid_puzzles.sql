-- Bridge Pyramid mode: self-contained authored units — 3 base bridge riddles
-- whose bridges all pair with meta_answer (the finale). Base riddles live in
-- `base` jsonb (not FK into connections_puzzles) because a pyramid is authored
-- as a unit: the 3 bridges are guaranteed compound-partners of meta_answer.
-- Runtime loads committed materialized snapshots (materialize-pyramids.mjs),
-- same fail-closed gate as connections_puzzles (is_active AND quality_score>=60).
create table public.connections_pyramid_puzzles (
  id text primary key,
  locale text not null,
  meta_answer text not null,
  meta_accepted text[] not null default '{}',
  meta_hint text,
  base jsonb not null, -- [{word1,bridge,word2,accepted:[],hint,difficulty}] length 3
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  quality_score numeric,
  source text not null default 'generated',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index connections_pyramid_active_idx on public.connections_pyramid_puzzles (locale, is_active);

alter table public.connections_pyramid_puzzles enable row level security;

-- Public read of active puzzles only; writes are service-role only (no policies).
create policy "pyramid_public_read" on public.connections_pyramid_puzzles
  for select using (is_active);
