-- Admin growth/revenue view: one summary RPC and one drill-down RPC.
-- Both exclude test accounts. Dollar amounts for Polar orders are not stored
-- in the database (only in PostHog), so revenue is reported as counts here;
-- offerwall payouts are real USD from offerwall_postbacks.

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
    'checkoutsStarted30d',   (SELECT COUNT(*) FROM ev WHERE event_type = 'checkout_started' AND created_at >= NOW() - INTERVAL '30 days'),
    'checkoutsStartedTotal', (SELECT COUNT(*) FROM ev WHERE event_type = 'checkout_started'),
    'paidOrders30d',         (SELECT COUNT(*) FROM paid WHERE created_at >= NOW() - INTERVAL '30 days'),
    'paidOrdersTotal',       (SELECT COUNT(*) FROM paid),
    'offerwallUsd30d',       (SELECT COALESCE(SUM(payout_usd) FILTER (WHERE NOT is_chargeback), 0) FROM ow WHERE created_at >= NOW() - INTERVAL '30 days'),
    'offerwallUsdTotal',     (SELECT COALESCE(SUM(payout_usd) FILTER (WHERE NOT is_chargeback), 0) FROM ow)
  );
$function$;

-- kind: 'signups' (week = Monday of the week), 'payers', 'checkouts' (last 30 days)
CREATE OR REPLACE FUNCTION public.admin_drilldown(kind text, week date DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF kind = 'signups' THEN
    RETURN COALESCE((SELECT json_agg(r ORDER BY r.created_at DESC) FROM (
      SELECT p.id, COALESCE(p.display_name, p.username) AS name, p.created_at,
             p.country_code AS country, p.utm_source AS source, p.total_games AS games
      FROM profiles p JOIN auth.users u ON u.id = p.id
      WHERE p.is_test_account IS NOT TRUE AND u.is_anonymous IS NOT TRUE
        AND (week IS NULL OR date_trunc('week', p.created_at)::date = week)
      ORDER BY p.created_at DESC LIMIT 200
    ) r), '[]'::json);
  ELSIF kind = 'payers' THEN
    RETURN COALESCE((SELECT json_agg(r ORDER BY r.created_at DESC) FROM (
      SELECT s.user_id AS id, COALESCE(p.display_name, p.username) AS name, s.tier, s.status,
             COALESCE(s.source, 'polar') AS source, s.cancel_at_period_end AS cancelling,
             s.current_period_end AS period_end, s.created_at
      FROM subscriptions s JOIN profiles p ON p.id = s.user_id
      WHERE p.is_test_account IS NOT TRUE AND s.tier = 'pro'
      ORDER BY s.created_at DESC LIMIT 200
    ) r), '[]'::json);
  ELSIF kind = 'checkouts' THEN
    RETURN COALESCE((SELECT json_agg(r ORDER BY r.created_at DESC) FROM (
      SELECT e.id, COALESCE(p.display_name, p.username, 'anonymous') AS name, e.created_at,
             e.payload->>'mode' AS mode, e.payload->>'locale' AS locale
      FROM subscription_events e LEFT JOIN profiles p ON p.id = e.user_id
      WHERE e.event_type = 'checkout_started' AND e.created_at >= NOW() - INTERVAL '30 days'
        AND (p.id IS NULL OR p.is_test_account IS NOT TRUE)
      ORDER BY e.created_at DESC LIMIT 200
    ) r), '[]'::json);
  END IF;
  RETURN '[]'::json;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_revenue_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revenue_summary() TO service_role;
REVOKE ALL ON FUNCTION public.admin_drilldown(text, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_drilldown(text, date) TO service_role;
