-- Lemon Squeezy subscription tracking for LexiClash
-- Tiers: free (default), pro ($5/class/mo)
-- Merged from standalone teacher-dashboard repo

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  tier text not null default 'free' check (tier in ('free', 'pro')),
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled', 'paused', 'trialing')),
  lemon_squeezy_subscription_id text,
  lemon_squeezy_order_id text,
  lemon_squeezy_variant_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  subscription_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscription_events_user_id on public.subscription_events(user_id);
create index if not exists idx_subscription_events_event_type on public.subscription_events(event_type);

-- Enable RLS
alter table public.subscriptions enable row level security;
alter table public.subscription_events enable row level security;

-- Policies: users can only read their own subscriptions
create policy "Users can read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Service role can do everything (server-side code uses service role key)
create policy "Service role full access on subscriptions"
  on public.subscriptions
  using (true)
  with check (true);

create policy "Service role full access on subscription_events"
  on public.subscription_events
  using (true)
  with check (true);

-- Trigger to update updated_at
create or replace function public.update_subscriptions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row
  execute function public.update_subscriptions_updated_at();