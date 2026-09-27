-- Resolution tracking so the nightly improvement loop CONVERGES: once a flagged
-- puzzle is regenerated, set resolved_at so the collector stops re-exporting it.
alter table public.connections_puzzle_reviews
  add column if not exists resolved_at timestamptz;
create index if not exists connections_puzzle_reviews_open_bad_idx
  on public.connections_puzzle_reviews (verdict) where verdict = 'bad' and resolved_at is null;
