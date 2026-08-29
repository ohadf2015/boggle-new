-- `subscription_events` shipped with a policy NAMED "Service role full access on
-- subscription_events" that was never scoped to a role, so it defaulted to PUBLIC.
-- service_role bypasses RLS anyway, so the policy did nothing for its stated purpose and
-- instead granted anon + authenticated ALL (select/insert/update/delete) on a billing
-- table — any anonymous caller could forge subscription events.
--
-- Verified live before the fix: `SET LOCAL ROLE anon` could INSERT successfully.
-- Verified after: the same INSERT raises 42501 "new row violates row-level security
-- policy for table subscription_events".
--
-- The sibling table `subscriptions` had already been corrected to `TO service_role`;
-- this one was missed. Scope it identically.
--
-- Server-side writers (the Polar and LemonSqueezy webhooks, via lib/subscriptions.ts)
-- were switched to the service-role client in the same change — they had been writing
-- with the request-scoped anon client and only succeeded here because of this hole.
ALTER POLICY "Service role full access on subscription_events"
  ON public.subscription_events
  TO service_role;
