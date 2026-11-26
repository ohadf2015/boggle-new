-- =============================================
-- READ-ONLY Teacher trial → paid funnel (t_53443d21).
-- Paste into the Supabase SQL editor. No writes.
--
-- Steps, canonical order (durable subscription_events rows):
--   1 trial_started        teacher_trial_started (legacy: trial webhook rows)
--   2 trial_active         teacher_trial_active (trialing teacher back in product)
--   3 trial_expiring       teacher_trial_expiring (legacy: day-10 / day-before notices)
--   4 trial_canceled       teacher_trial_canceled, or a subscription.canceled while Pro is still on
--   5 trial_expired        teacher_trial_expired / revoked. A cancel that still has Pro is NOT an expiry.
--   5 paywall_viewed       teacher_trial_paywall_viewed
--   6 checkout_started     checkout_started (script probes excluded)
--   7 subscription_active  teacher_subscription_active (legacy: paid webhook rows)
--
-- QA rigs excluded via profiles.is_test_account + the lexiclash.test domain.
-- Legacy rows (pre-instrumentation webhooks) count so the all-time numbers are
-- honest about the two October trial checkouts that never completed.
-- =============================================

WITH real_teachers AS (
  SELECT p.id
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE COALESCE(p.is_test_account, false) = false
    AND u.email IS NOT NULL
    AND u.email NOT ILIKE '%@lexiclash.test'
),
step_rows AS (
  SELECT se.user_id, 1 AS step_index, 'trial_started' AS step, se.created_at
  FROM public.subscription_events se
  WHERE se.event_type = 'teacher_trial_started'
     OR (se.event_type IN ('subscription.created', 'subscription.active')
         AND COALESCE(se.payload->>'trial', '') = 'true')
  UNION ALL
  SELECT se.user_id, 2, 'trial_active', se.created_at
  FROM public.subscription_events se
  WHERE se.event_type = 'teacher_trial_active'
  UNION ALL
  SELECT se.user_id, 3, 'trial_expiring', se.created_at
  FROM public.subscription_events se
  WHERE se.event_type IN ('teacher_trial_expiring', 'polar_trial_day10_sent', 'polar_trial_day_before_sent')
  UNION ALL
  SELECT se.user_id, 4, 'trial_canceled', se.created_at
  FROM public.subscription_events se
  WHERE se.event_type = 'teacher_trial_canceled'
     OR (
       se.event_type = 'subscription.canceled'
       AND COALESCE(se.payload->>'trial', '') = 'true'
       AND (
         COALESCE(se.payload->>'cancel_at_period_end', '') IN ('true', 't')
         OR EXISTS (
           SELECT 1 FROM public.subscriptions s
           WHERE s.user_id = se.user_id
             AND s.tier = 'pro'
             AND s.status = 'trialing'
             AND s.cancel_at_period_end = true
             AND s.current_period_end > now()
         )
       )
     )
  UNION ALL
  SELECT se.user_id, 5, 'trial_expired', se.created_at
  FROM public.subscription_events se
  WHERE (
      se.event_type = 'teacher_trial_expired'
      OR (
        se.event_type = 'subscription.revoked'
        AND COALESCE(se.payload->>'trial', '') = 'true'
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = se.user_id
        AND s.tier = 'pro'
        AND s.status = 'trialing'
        AND s.current_period_end > now()
    )
  UNION ALL
  SELECT se.user_id, 5, 'paywall_viewed', se.created_at
  FROM public.subscription_events se
  WHERE se.event_type = 'teacher_trial_paywall_viewed'
  UNION ALL
  SELECT se.user_id, 6, 'checkout_started', se.created_at
  FROM public.subscription_events se
  WHERE se.event_type = 'checkout_started'
    AND COALESCE(se.payload->>'client_kind', 'browser') <> 'script'
  UNION ALL
  SELECT se.user_id, 7, 'subscription_active', se.created_at
  FROM public.subscription_events se
  WHERE se.event_type = 'teacher_subscription_active'
     OR (se.event_type = 'subscription.active'
         AND COALESCE(se.payload->>'trial', 'false') <> 'true')
),
per_teacher AS (
  SELECT sr.step_index, sr.step, sr.user_id, min(sr.created_at) AS first_at
  FROM step_rows sr
  JOIN real_teachers t ON t.id = sr.user_id
  GROUP BY sr.step_index, sr.step, sr.user_id
)
SELECT
  step_index,
  step,
  count(DISTINCT user_id) AS teachers,
  count(DISTINCT user_id) FILTER (WHERE first_at >= now() - interval '30 days') AS teachers_30d,
  min(first_at) AS first_reached_at,
  max(first_at) AS last_reached_at
FROM per_teacher
GROUP BY step_index, step
ORDER BY step_index;

-- Cancel reasons for the last 30 days. Polar portal fields, plus the in-app chip
-- (event_type teacher_trial_cancel_reason). Paste on its own. A still-running
-- trial that was canceled must show up here, not as trial_expired above.
WITH real_teachers AS (
  SELECT p.id
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE COALESCE(p.is_test_account, false) = false
    AND u.email IS NOT NULL
    AND u.email NOT ILIKE '%@lexiclash.test'
)
SELECT
  COALESCE(
    NULLIF(se.payload->>'customer_cancellation_reason', ''),
    NULLIF(se.payload->>'cancel_reason', ''),
    '(none)'
  ) AS reason,
  count(DISTINCT se.user_id) AS teachers
FROM public.subscription_events se
JOIN real_teachers t ON t.id = se.user_id
WHERE se.created_at >= now() - interval '30 days'
  AND se.event_type IN ('teacher_trial_canceled', 'teacher_trial_cancel_reason', 'subscription.canceled')
  AND (
    se.event_type = 'teacher_trial_cancel_reason'
    OR COALESCE(se.payload->>'trial', '') = 'true'
  )
GROUP BY 1
ORDER BY teachers DESC, reason;
