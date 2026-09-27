-- Per-user circular-mean play time for the smart daily-challenge reminder.
-- Cron joins this view to schedule pushes 30 min after each user's usual
-- play time, in their local TZ. HAVING COUNT(*) >= 3 keeps one-off plays
-- from anchoring future reminders to a fluke hour.

CREATE OR REPLACE VIEW v_user_daily_play_avg
WITH (security_invoker = true)
AS
WITH attempts AS (
    SELECT player_id, completed_at
    FROM daily_puzzle_attempts
    WHERE completed_at IS NOT NULL
      AND completed_at >= NOW() - INTERVAL '30 days'
    UNION ALL
    SELECT player_id, completed_at
    FROM daily_word_hunt_attempts
    WHERE completed_at IS NOT NULL
      AND completed_at >= NOW() - INTERVAL '30 days'
),
per_attempt AS (
    SELECT
        a.player_id,
        COALESCE(p.timezone, 'UTC') AS timezone,
        EXTRACT(HOUR   FROM (a.completed_at AT TIME ZONE COALESCE(p.timezone, 'UTC'))) * 60
      + EXTRACT(MINUTE FROM (a.completed_at AT TIME ZONE COALESCE(p.timezone, 'UTC')))
            AS minute_of_day
    FROM attempts a
    JOIN profiles p ON p.id = a.player_id
)
SELECT
    player_id,
    MIN(timezone) AS timezone,           -- timezone is per-user; MIN picks any row
    COUNT(*)::INT AS sample_size,
    -- Circular mean: angle = atan2(avg(sin), avg(cos)); back to minutes.
    -- Add 1440 then mod to fold negative atan2 results into [0, 1440).
    (
        (
            (
                ATAN2(
                    AVG(SIN(minute_of_day::float * 2 * PI() / 1440)),
                    AVG(COS(minute_of_day::float * 2 * PI() / 1440))
                ) / (2 * PI())
            ) * 1440 + 1440
        )::int % 1440
    ) AS avg_play_minute_of_day
FROM per_attempt
GROUP BY player_id
HAVING COUNT(*) >= 3;

GRANT SELECT ON v_user_daily_play_avg TO service_role;

COMMENT ON VIEW v_user_daily_play_avg IS
    'Per-user 30d rolling circular-mean of daily-challenge completion time, '
    'in user local-clock minutes-of-day. Drives smart push-reminder scheduling. '
    'Sample size >= 3 to avoid anchoring on one-off plays.';
