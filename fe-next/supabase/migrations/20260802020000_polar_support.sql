-- Polar.sh merchant-of-record support (Lemon Squeezy replacement, 2026-08-02)
-- LS columns kept for dormant provider; Polar columns added alongside.

alter table public.subscriptions
  add column if not exists polar_subscription_id text,
  add column if not exists polar_customer_id text,
  add column if not exists polar_product_id text,
  add column if not exists polar_order_id text,
  add column if not exists payment_provider text not null default 'lemonsqueezy'
    check (payment_provider in ('lemonsqueezy', 'polar'));

create index if not exists idx_subscriptions_polar_customer_id
  on public.subscriptions(polar_customer_id);
create index if not exists idx_subscriptions_polar_subscription_id
  on public.subscriptions(polar_subscription_id);
