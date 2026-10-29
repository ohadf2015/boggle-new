-- =============================================
-- READ-ONLY signup readout (t_3b095edf). No writes — paste into the
-- Supabase SQL editor. Grades the post-signup first-game card without UR.
--
-- A "game" is the UR audit definition: a game_results row, a non-MP
-- game_sessions row (mode is not multiplayer AND room_code is null), or a
-- daily word-wheel / word-hunt attempt whose player id is the new account.
-- Guest rows are not attached (player id must be the account).
--
-- 24h is the signup timestamp plus 24 hours. Days 1-7 are Israel calendar
-- days AFTER the signup day (Asia/Jerusalem), so day 0 does not count as a
-- return. 24h-eligible = signed up at least 24h ago. Day-1-7-eligible =
-- signed up at least 1 day ago (day 1 has occurred). The 09-22..10-21 audit
-- was 57/127 with no game in 24h (45%) and 14/125 playing on days 1-7 (11%).
-- =============================================

WITH signups AS (
  SELECT
    p.id,
    p.created_at,
    COALESCE(NULLIF(TRIM(p.signup_surface), ''), '(none)') AS signup_surface,
    COALESCE(NULLIF(TRIM(p.user_role::text), ''), 'student') AS role
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.created_at >= now() - interval '30 days'
    AND COALESCE(p.is_test_account, false) = false
    -- Email lives on auth.users, not profiles. Null email = guest; @lexiclash.test = QA.
    AND u.email IS NOT NULL
    AND u.email NOT ILIKE '%@lexiclash.test'
),
games AS (
  SELECT player_id AS account_id, created_at AS played_at
  FROM public.game_results
  WHERE player_id IS NOT NULL
  UNION ALL
  SELECT user_id, COALESCE(completed_at, started_at)
  FROM public.game_sessions
  WHERE user_id IS NOT NULL
    AND COALESCE(mode, '') <> 'multiplayer'
    AND room_code IS NULL
  UNION ALL
  SELECT player_id, completed_at
  FROM public.daily_word_wheel_attempts
  WHERE player_id IS NOT NULL
  UNION ALL
  SELECT player_id, completed_at
  FROM public.daily_word_hunt_attempts
  WHERE player_id IS NOT NULL
)
SELECT
  s.signup_surface,
  s.role,
  count(*) AS signups,
  count(*) FILTER (WHERE s.created_at <= now() - interval '24 hours') AS eligible_24h,
  count(*) FILTER (
    WHERE s.created_at <= now() - interval '24 hours' AND g24.account_id IS NOT NULL
  ) AS played_24h,
  count(*) FILTER (
    WHERE s.created_at <= now() - interval '24 hours' AND g24.account_id IS NULL
  ) AS no_game_24h,
  round(
    100.0 * count(*) FILTER (
      WHERE s.created_at <= now() - interval '24 hours' AND g24.account_id IS NULL
    ) / nullif(count(*) FILTER (WHERE s.created_at <= now() - interval '24 hours'), 0),
    1
  ) AS pct_no_game_24h,
  count(*) FILTER (WHERE s.created_at <= now() - interval '1 day') AS eligible_days_1_7,
  count(*) FILTER (
    WHERE s.created_at <= now() - interval '1 day' AND gd.account_id IS NOT NULL
  ) AS played_days_1_7,
  round(
    100.0 * count(*) FILTER (
      WHERE s.created_at <= now() - interval '1 day' AND gd.account_id IS NOT NULL
    ) / nullif(count(*) FILTER (WHERE s.created_at <= now() - interval '1 day'), 0),
    1
  ) AS pct_played_days_1_7
FROM signups s
LEFT JOIN LATERAL (
  SELECT g.account_id
  FROM games g
  WHERE g.account_id = s.id
    AND g.played_at >= s.created_at
    AND g.played_at < s.created_at + interval '24 hours'
  LIMIT 1
) g24 ON true
LEFT JOIN LATERAL (
  SELECT g.account_id
  FROM games g
  WHERE g.account_id = s.id
    AND (g.played_at AT TIME ZONE 'Asia/Jerusalem')::date
        BETWEEN (s.created_at AT TIME ZONE 'Asia/Jerusalem')::date + 1
            AND (s.created_at AT TIME ZONE 'Asia/Jerusalem')::date + 7
  LIMIT 1
) gd ON true
GROUP BY s.signup_surface, s.role
ORDER BY signups DESC, s.signup_surface, s.role;
