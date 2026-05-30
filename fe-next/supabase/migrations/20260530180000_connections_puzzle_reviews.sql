-- Admin verdicts on connection puzzles. One row per puzzle_id (upsert).
-- Stores a snapshot of the puzzle so the nightly improvement loop has full data.
-- Admin-only: RLS enabled with NO policies → only the service-role API touches it.
-- NOT added to supabase_realtime.
create table if not exists public.connections_puzzle_reviews (
  puzzle_id text primary key,
  language text not null,
  word1 text not null,
  word2 text not null,
  bridge text not null,
  verdict text not null check (verdict in ('good', 'bad', 'unsure')),
  note text,
  reviewed_by uuid references auth.users on delete set null,
  reviewed_at timestamptz not null default now()
);
create index if not exists connections_puzzle_reviews_verdict_idx
  on public.connections_puzzle_reviews (verdict, language);
alter table public.connections_puzzle_reviews enable row level security;
comment on table public.connections_puzzle_reviews is
  'Admin good/bad verdicts on connection puzzles. Service-role-only; bad-flagged rows feed the nightly improvement loop. NOT in supabase_realtime.';
