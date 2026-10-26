-- Links a LexiClash account to a school identity (Google, Microsoft, SIS, LMS) so a
-- returning or rostered student is matched by provider id, not by email. Only a sha256
-- of the school email is kept, for matching; raw emails of minors are never stored.
create table if not exists public.external_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft', 'clever', 'classlink', 'canvas')),
  external_id text not null check (length(external_id) between 1 and 255),
  email_hash text check (email_hash is null or email_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (provider, external_id)
);

create index if not exists external_identities_user_id_idx
  on public.external_identities (user_id);
create index if not exists external_identities_provider_email_hash_idx
  on public.external_identities (provider, email_hash)
  where email_hash is not null;

alter table public.external_identities enable row level security;

revoke all on public.external_identities from anon;
revoke insert, update, delete on public.external_identities from authenticated;

drop policy if exists "Users read their own external identities" on public.external_identities;
create policy "Users read their own external identities"
  on public.external_identities
  for select
  to authenticated
  using (user_id = (select auth.uid()));
