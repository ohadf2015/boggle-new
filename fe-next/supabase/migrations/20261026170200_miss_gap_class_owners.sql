-- The homework key is guessable text; the first teacher to open the card owns it and alone sees names.
create table if not exists public.miss_gap_class_owners (
  class_key text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now()
);

alter table public.miss_gap_class_owners enable row level security;
revoke all on table public.miss_gap_class_owners from public, anon, authenticated;
