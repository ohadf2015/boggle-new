-- Fix RLS initplan on subscriptions table (performance advisor warning)
-- auth.uid() evaluated per-row → wrap in (select auth.uid()) to promote to initplan
-- Also scope policies to specific roles to avoid multiple-permissive-policies warning

drop policy if exists "Users can read own subscription" on public.subscriptions;
drop policy if exists "Service role full access on subscriptions" on public.subscriptions;

create policy "Users can read own subscription"
  on public.subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Service role full access on subscriptions"
  on public.subscriptions
  to service_role
  using (true)
  with check (true);
