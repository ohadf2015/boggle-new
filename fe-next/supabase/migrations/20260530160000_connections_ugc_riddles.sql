-- Community (UGC) Word Bridge riddles + votes.
-- Players suggest riddles → 'pending' for moderation → 'approved' surface in a
-- community list ranked by upvotes. Service-role writes only; public reads
-- approved rows. NOT added to supabase_realtime (read on-demand only).

create table if not exists public.connections_ugc_puzzles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  creator_id uuid references auth.users on delete set null,
  creator_guest_fingerprint text,
  creator_display_name text not null,
  word1 text not null,
  word2 text not null,
  bridge text not null,
  language text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  upvotes integer not null default 0 check (upvotes >= 0),
  plays integer not null default 0 check (plays >= 0),
  constraint connections_ugc_creator check (creator_id is not null or creator_guest_fingerprint is not null)
);
create index if not exists connections_ugc_rank_idx
  on public.connections_ugc_puzzles (status, language, upvotes desc, created_at asc);

create table if not exists public.connections_ugc_votes (
  id uuid primary key default gen_random_uuid(),
  puzzle_id uuid not null references public.connections_ugc_puzzles on delete cascade,
  voter_id uuid references auth.users on delete cascade,
  voter_guest_fingerprint text,
  created_at timestamptz not null default now()
);
-- One vote per identity per puzzle (partial indexes; NULL side would defeat a composite unique).
create unique index if not exists connections_ugc_votes_user_uq
  on public.connections_ugc_votes (puzzle_id, voter_id) where voter_id is not null;
create unique index if not exists connections_ugc_votes_guest_uq
  on public.connections_ugc_votes (puzzle_id, voter_guest_fingerprint) where voter_guest_fingerprint is not null;

alter table public.connections_ugc_puzzles enable row level security;
alter table public.connections_ugc_votes enable row level security;

-- Public sees only APPROVED riddles. Submit/vote/moderate flow through
-- service-role API routes (no anon write policy).
drop policy if exists "connections ugc approved public" on public.connections_ugc_puzzles;
create policy "connections ugc approved public"
  on public.connections_ugc_puzzles for select using (status = 'approved');
-- votes: RLS enabled, no policies → anon has no access; only the service-role route touches it.

comment on table public.connections_ugc_puzzles is
  'Community-suggested Word Bridge riddles. Service-role writes; public read of approved only; NOT in supabase_realtime.';
