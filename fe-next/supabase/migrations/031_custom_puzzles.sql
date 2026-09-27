create table if not exists custom_puzzles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  puzzle_code text unique not null,
  creator_id uuid references auth.users,
  creator_guest_fingerprint text,
  creator_display_name text not null,
  language text not null,
  target_word text not null,
  grid jsonb not null,
  creator_solved boolean not null,
  creator_attempts_used integer not null,
  creator_efficiency_score integer not null
);

-- Indexes for performance
create index if not exists idx_custom_puzzles_code on custom_puzzles(puzzle_code);
create index if not exists idx_custom_puzzles_creator on custom_puzzles(creator_id);

-- Enable RLS
alter table custom_puzzles enable row level security;

-- Policies
create policy "Custom puzzles are viewable by everyone"
  on custom_puzzles for select
  using (true);

create policy "Anyone can create custom puzzles"
  on custom_puzzles for insert
  with check (true);
