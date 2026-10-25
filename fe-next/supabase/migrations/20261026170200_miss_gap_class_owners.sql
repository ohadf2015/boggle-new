-- The miss-gap homework key is guessable text, so any teacher account could read
-- another class's named roster. The first teacher to open the homework card claims
-- the key; only that owner is shown student names. Service role only.
create table if not exists public.miss_gap_class_owners (
  class_key text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now()
);

alter table public.miss_gap_class_owners enable row level security;
revoke all on table public.miss_gap_class_owners from public, anon, authenticated;
