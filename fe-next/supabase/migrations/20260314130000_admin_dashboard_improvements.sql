-- ============================================================
-- Admin Dashboard Improvements Migration
-- Adds: admin roles, moderation actions, audit log, game audit,
--        materialized views (DAU/MAU, cheat signals), and RPC functions
-- ============================================================

-- 1. Add admin_role and ban columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin_role TEXT CHECK (admin_role IN ('viewer','moderator','operator','superadmin')) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON profiles (is_banned) WHERE is_banned = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_admin_role ON profiles (admin_role) WHERE admin_role IS NOT NULL;

-- 2. Moderation actions table (ban/suspend/warn history)
CREATE TABLE IF NOT EXISTS moderation_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_id        UUID NOT NULL REFERENCES profiles(id),
  action_type     TEXT NOT NULL CHECK (action_type IN ('ban','suspend','warn','unsuspend','note')),
  reason          TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at      TIMESTAMPTZ DEFAULT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_moderation_target ON moderation_actions (target_player_id, is_active);
CREATE INDEX IF NOT EXISTS idx_moderation_admin  ON moderation_actions (admin_id);

ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY moderation_actions_admin_only ON moderation_actions
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- 3. Persistent admin audit log table (queryable, PII-free)
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID REFERENCES profiles(id),
  action      TEXT NOT NULL,
  target_id   TEXT,
  target_type TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_admin   ON admin_audit_log (admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON admin_audit_log (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target  ON admin_audit_log (target_id, target_type);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_admin_only ON admin_audit_log
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- 4. Game audit log table (word-by-word replay data)
CREATE TABLE IF NOT EXISTS game_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_code    TEXT NOT NULL,
  player_id    UUID REFERENCES profiles(id),
  event_type   TEXT NOT NULL CHECK (event_type IN ('word_accepted','word_rejected','hint_used','game_end')),
  word         TEXT,
  score_delta  INTEGER,
  timestamp_ms BIGINT NOT NULL,
  metadata     JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_game_audit_code   ON game_audit_log (game_code, timestamp_ms);
CREATE INDEX IF NOT EXISTS idx_game_audit_player ON game_audit_log (player_id, game_code);

-- 5. Admin alerts table
CREATE TABLE IF NOT EXISTS admin_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_code      TEXT NOT NULL,
  severity        TEXT NOT NULL CHECK (severity IN ('P0','P1','P2')),
  message         TEXT NOT NULL,
  metric_value    NUMERIC,
  threshold_value NUMERIC,
  fired_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES profiles(id),
  silenced_until  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_severity ON admin_alerts (severity, fired_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON admin_alerts (fired_at DESC) WHERE resolved_at IS NULL;

-- 6. Materialized view: DAU/MAU (refresh every 5 minutes via pg_cron)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dau_mau AS
SELECT
  date_trunc('day', created_at)::date AS day,
  COUNT(DISTINCT player_id)            AS dau,
  COUNT(*)                             AS games
FROM game_results
GROUP BY 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dau_mau_day ON mv_dau_mau (day);

-- 7. Materialized view: cheat signals (refresh every hour)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_cheat_signals AS
SELECT
  player_id,
  COUNT(*)                                                       AS games_played,
  ROUND(AVG(score)::NUMERIC, 2)                                  AS avg_score,
  MAX(score)                                                     AS max_score,
  ROUND(AVG(word_count)::NUMERIC, 2)                             AS avg_words,
  MAX(word_count)                                                AS max_words,
  ROUND(COALESCE(STDDEV(score), 0)::NUMERIC, 2)                  AS score_stddev,
  ROUND(
    CASE WHEN STDDEV(score) > 0
      THEN (MAX(score) - AVG(score)) / STDDEV(score)
      ELSE 0
    END::NUMERIC, 2
  )                                                              AS score_zscore
FROM game_results
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY player_id
HAVING COUNT(*) >= 5;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_cheat_player ON mv_cheat_signals (player_id);
CREATE INDEX IF NOT EXISTS idx_mv_cheat_zscore  ON mv_cheat_signals (score_zscore DESC);

-- 8. RPC: dashboard overview stats (replaces 11+ sequential queries)
CREATE OR REPLACE FUNCTION admin_overview_stats()
RETURNS JSON LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT json_build_object(
    'totalPlayers',       (SELECT COUNT(*) FROM profiles),
    'totalGames',         (SELECT COUNT(*) FROM game_results),
    'totalWords',         (SELECT COALESCE(SUM(total_words), 0) FROM profiles),
    'totalGameTimeHours', (SELECT ROUND(COALESCE(SUM(total_time_played), 0) / 3600.0, 1) FROM profiles)
  );
$$;

CREATE OR REPLACE FUNCTION admin_activity_stats()
RETURNS JSON LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  WITH periods AS (
    SELECT
      NOW()::date                          AS today,
      (NOW() - INTERVAL '7 days')::date   AS week_ago,
      (NOW() - INTERVAL '30 days')::date  AS month_ago
  )
  SELECT json_build_object(
    'gamesToday',         (SELECT COUNT(*) FROM game_results WHERE created_at::date = (SELECT today FROM periods)),
    'uniquePlayersToday', (SELECT COUNT(DISTINCT player_id) FROM game_results WHERE created_at::date = (SELECT today FROM periods)),
    'uniquePlayersWeek',  (SELECT COUNT(DISTINCT player_id) FROM game_results WHERE created_at >= (SELECT week_ago FROM periods)),
    'uniquePlayersMonth', (SELECT COUNT(DISTINCT player_id) FROM game_results WHERE created_at >= (SELECT month_ago FROM periods)),
    'signupsToday',       (SELECT COUNT(*) FROM profiles WHERE created_at::date = (SELECT today FROM periods)),
    'signupsWeek',        (SELECT COUNT(*) FROM profiles WHERE created_at >= (SELECT week_ago FROM periods))
  );
$$;

CREATE OR REPLACE FUNCTION admin_language_breakdown()
RETURNS JSON LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(json_object_agg(lang, cnt), '{}'::json)
  FROM (
    SELECT COALESCE(language, 'en') AS lang, COUNT(*) AS cnt
    FROM game_results
    GROUP BY 1
    ORDER BY cnt DESC
  ) sub;
$$;

-- 9. RPC: cohort retention analysis
CREATE OR REPLACE FUNCTION admin_cohort_retention(weeks INT DEFAULT 12)
RETURNS TABLE (
  cohort_week  DATE,
  week_offset  INT,
  retained     BIGINT,
  cohort_size  BIGINT,
  retention_pct NUMERIC
) LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  WITH cohorts AS (
    SELECT
      id,
      date_trunc('week', created_at)::date AS cohort_week
    FROM profiles
    WHERE created_at >= NOW() - (weeks || ' weeks')::INTERVAL
  ),
  activity AS (
    SELECT
      player_id,
      date_trunc('week', created_at)::date AS activity_week
    FROM game_results
    WHERE created_at >= NOW() - (weeks || ' weeks')::INTERVAL
    GROUP BY 1, 2
  ),
  cohort_sizes AS (
    SELECT cohort_week, COUNT(DISTINCT id) AS size
    FROM cohorts
    GROUP BY cohort_week
  )
  SELECT
    c.cohort_week,
    ((a.activity_week - c.cohort_week) / 7)::INT AS week_offset,
    COUNT(DISTINCT c.id)    AS retained,
    cs.size                 AS cohort_size,
    ROUND(100.0 * COUNT(DISTINCT c.id) / NULLIF(cs.size, 0), 1) AS retention_pct
  FROM cohorts c
  JOIN activity a ON c.id = a.player_id
  JOIN cohort_sizes cs ON c.cohort_week = cs.cohort_week
  GROUP BY c.cohort_week, a.activity_week, cs.size
  ORDER BY c.cohort_week, week_offset;
$$;

-- 10. RPC: bulk ban (atomic transaction)
CREATE OR REPLACE FUNCTION admin_bulk_ban_players(
  p_player_ids UUID[],
  p_reason     TEXT,
  p_admin_id   UUID
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  banned_count INT;
BEGIN
  UPDATE profiles
  SET is_banned = TRUE, ban_reason = p_reason
  WHERE id = ANY(p_player_ids) AND is_banned = FALSE;

  GET DIAGNOSTICS banned_count = ROW_COUNT;

  INSERT INTO moderation_actions (target_player_id, admin_id, action_type, reason)
  SELECT unnest(p_player_ids), p_admin_id, 'ban', p_reason;

  INSERT INTO admin_audit_log (admin_id, action, target_type, metadata)
  VALUES (p_admin_id, 'bulk_ban', 'player', json_build_object('count', banned_count, 'reason', p_reason));

  RETURN json_build_object('count', banned_count);
END;
$$;

-- 11. RPC: engagement funnel (signup → first game → D7 → D30)
CREATE OR REPLACE FUNCTION admin_engagement_funnel()
RETURNS JSON LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  WITH new_users AS (
    SELECT id
    FROM profiles
    WHERE created_at >= NOW() - INTERVAL '30 days'
      AND user_role IS NOT NULL
  ),
  activated AS (
    SELECT DISTINCT gr.player_id AS id
    FROM game_results gr
    JOIN new_users nu ON gr.player_id = nu.id
  ),
  day7 AS (
    SELECT DISTINCT gr.player_id AS id
    FROM game_results gr
    JOIN new_users nu ON gr.player_id = nu.id
    JOIN profiles p ON p.id = nu.id
    WHERE gr.created_at >= p.created_at + INTERVAL '7 days'
  ),
  day30 AS (
    SELECT DISTINCT gr.player_id AS id
    FROM game_results gr
    JOIN new_users nu ON gr.player_id = nu.id
    JOIN profiles p ON p.id = nu.id
    WHERE gr.created_at >= p.created_at + INTERVAL '30 days'
  )
  SELECT json_build_object(
    'registered',      (SELECT COUNT(*) FROM new_users),
    'playedFirstGame', (SELECT COUNT(*) FROM activated),
    'returnedDay7',    (SELECT COUNT(*) FROM day7),
    'returnedDay30',   (SELECT COUNT(*) FROM day30)
  );
$$;

-- NOTE: To enable automatic refresh of materialized views, run in Supabase Dashboard:
-- 1. Enable pg_cron extension: CREATE EXTENSION IF NOT EXISTS pg_cron;
-- 2. Schedule refreshes:
--    SELECT cron.schedule('refresh-dau', '*/5 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dau_mau');
--    SELECT cron.schedule('refresh-cheat', '0 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cheat_signals');
