-- Churn reporting: a Polar Pro sub that is past_due/canceled/unpaid AND whose owner
-- has not signed in for 30 days is counted as churned-dormant, not "in dunning".
-- (ur-audit 2026-11-17: the only paid Teacher Pro sub was past_due with the teacher
-- dormant since day one — reporting must call that churn, not a recovering customer.)

CREATE OR REPLACE FUNCTION public.admin_revenue_summary()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH real AS (SELECT id FROM profiles WHERE is_test_account IS NOT TRUE),
  subs AS (SELECT * FROM subscriptions WHERE user_id IN (SELECT id FROM real)),
  ev AS (SELECT * FROM subscription_events WHERE user_id IS NULL OR user_id IN (SELECT id FROM real)),
  paid AS (SELECT * FROM ev WHERE event_type = 'order.paid' AND COALESCE(payload->>'trial', 'false') <> 'true'),
  ow AS (SELECT * FROM offerwall_postbacks WHERE user_id IN (SELECT id FROM real))
  SELECT json_build_object(
    'registered',            (SELECT COUNT(*) FROM profiles p JOIN auth.users u ON u.id = p.id
                              WHERE p.is_test_account IS NOT TRUE AND u.is_anonymous IS NOT TRUE),
    'paying',                (SELECT COUNT(*) FROM subs WHERE source = 'polar' AND tier = 'pro' AND status = 'active'),
    'trialing',              (SELECT COUNT(*) FROM subs WHERE source = 'polar' AND status = 'trialing'),
    'pastDue',               (SELECT COUNT(*) FROM subs WHERE source = 'polar' AND status = 'past_due'),
    'cancelling',            (SELECT COUNT(*) FROM subs WHERE source = 'polar' AND cancel_at_period_end),
    'granted',               (SELECT COUNT(*) FROM subs WHERE source IS DISTINCT FROM 'polar' AND status IN ('active', 'trialing')),
    -- past_due/canceled + no sign-in for 30d = churned, whatever Polar still calls it.
    'churnedDormant',        (SELECT COUNT(*) FROM subs s JOIN auth.users u ON u.id = s.user_id
                              WHERE s.source = 'polar' AND s.tier = 'pro'
                                AND s.status IN ('past_due', 'canceled', 'unpaid', 'incomplete_expired')
                                AND (u.last_sign_in_at IS NULL OR u.last_sign_in_at < NOW() - INTERVAL '30 days')),
    'checkoutsStarted30d',   (SELECT COUNT(*) FROM ev WHERE event_type = 'checkout_started' AND created_at >= NOW() - INTERVAL '30 days'),
    'checkoutsStartedTotal', (SELECT COUNT(*) FROM ev WHERE event_type = 'checkout_started'),
    'paidOrders30d',         (SELECT COUNT(*) FROM paid WHERE created_at >= NOW() - INTERVAL '30 days'),
    'paidOrdersTotal',       (SELECT COUNT(*) FROM paid),
    'offerwallUsd30d',       (SELECT COALESCE(SUM(payout_usd) FILTER (WHERE NOT is_chargeback), 0) FROM ow WHERE created_at >= NOW() - INTERVAL '30 days'),
    'offerwallUsdTotal',     (SELECT COALESCE(SUM(payout_usd) FILTER (WHERE NOT is_chargeback), 0) FROM ow)
  );
$function$;

REVOKE ALL ON FUNCTION public.admin_revenue_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revenue_summary() TO service_role;
