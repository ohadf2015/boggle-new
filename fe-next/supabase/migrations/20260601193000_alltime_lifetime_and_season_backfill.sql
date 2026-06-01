-- All-time leaderboard accuracy + current-season backfill.
--
-- Problem 1 (all-time < previous seasons):
--   The `leaderboard` table is season-scoped: process_season_reset() bumps each
--   row's season_id forward and soft-resets its score to 10%, so the table only
--   ever holds the CURRENT season's rows. get_leaderboard(0) returned that whole
--   table => the "all-time" tab actually showed the current season (small),
--   while "previous seasons" reads the season_leaderboards archive (large).
--   True lifetime lives in profiles.total_score and was never ranked.
--
--   Fix: the `0` sentinel (all-time) now ranks by profiles lifetime totals in
--   get_leaderboard, get_user_rank and get_user_tier_position.
--
-- Problem 3 (current-season rows stale-low):
--   Word Wheel / Word Hunt bump profiles.total_score via updateDailyProfileStats
--   but never called updateLeaderboardEntry, so daily-heavy players' season rows
--   lagged lifetime. The forward-fix lives in the route handlers; this migration
--   backfills the existing stale rows using the same derivation
--   updateLeaderboardEntry applies:
--     season_score        = max(0, lifetime − Σ prior finals + 10% × prev final)
--     season_games_played = max(0, lifetime_games − Σ prior season games)
--     season_games_won    = min(season_games_played, lifetime_wins − Σ prior wins)

-- ─────────────────────────────────────────────────────────────────────────────
-- get_leaderboard: 0 = all-time lifetime from profiles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_order_by text DEFAULT 'total_score'::text,
  p_season_id integer DEFAULT NULL::integer
)
RETURNS TABLE(player_id uuid, username text, display_name text, avatar_emoji text,
              avatar_color text, avatar_image text, avatar_config jsonb,
              total_score integer, games_played integer, games_won integer,
              ranked_mmr integer, rank_position bigint, season_id integer)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE v_season_id INTEGER;
BEGIN
  v_season_id := COALESCE(p_season_id, public.get_current_season_id(), 1);

  -- All-time (sentinel 0): rank by lifetime totals from profiles. The
  -- season-scoped `leaderboard` table only holds the current season's rows,
  -- so ranking it for "all-time" understates every player.
  IF v_season_id = 0 THEN
    RETURN QUERY
    SELECT pr.id AS player_id,
           pr.username,
           NULLIF(pr.display_name, '') AS display_name,
           pr.avatar_emoji,
           pr.avatar_color,
           pr.avatar_image,
           pr.avatar_config,
           COALESCE(pr.total_score, 0) AS total_score,
           COALESCE(pr.total_games, 0) AS games_played,
           COALESCE(pr.casual_wins, 0) + COALESCE(pr.ranked_wins, 0) AS games_won,
           COALESCE(pr.ranked_mmr, 1000) AS ranked_mmr,
           ROW_NUMBER() OVER (ORDER BY COALESCE(pr.total_score, 0) DESC,
                                       COALESCE(pr.total_games, 0) DESC) AS rank_position,
           0 AS season_id
      FROM profiles pr
     WHERE COALESCE(pr.total_score, 0) > 0
     ORDER BY COALESCE(pr.total_score, 0) DESC, COALESCE(pr.total_games, 0) DESC
     LIMIT p_limit OFFSET p_offset;
    RETURN;
  END IF;

  IF p_order_by = 'ranked_mmr' THEN
    RETURN QUERY
    SELECT l.player_id, l.username, l.display_name, l.avatar_emoji, l.avatar_color,
           l.avatar_image, l.avatar_config,
           l.total_score, l.games_played, l.games_won, l.ranked_mmr,
           ROW_NUMBER() OVER (ORDER BY l.ranked_mmr DESC, l.games_won DESC) AS rank_position,
           l.season_id
      FROM leaderboard l
     WHERE l.season_id = v_season_id
     ORDER BY l.ranked_mmr DESC, l.games_won DESC
     LIMIT p_limit OFFSET p_offset;
  ELSE
    RETURN QUERY
    SELECT l.player_id, l.username, l.display_name, l.avatar_emoji, l.avatar_color,
           l.avatar_image, l.avatar_config,
           l.total_score, l.games_played, l.games_won, l.ranked_mmr,
           ROW_NUMBER() OVER (ORDER BY l.total_score DESC, l.games_played DESC) AS rank_position,
           l.season_id
      FROM leaderboard l
     WHERE l.season_id = v_season_id
     ORDER BY l.total_score DESC, l.games_played DESC
     LIMIT p_limit OFFSET p_offset;
  END IF;
END $function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- get_user_rank: add p_season_id (default NULL = player's current season row).
-- 0 = all-time lifetime rank from profiles. Drop the old 1-arg signature so the
-- existing rpc('get_user_rank', { p_user_id }) call resolves to this one.
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_user_rank(uuid);

CREATE OR REPLACE FUNCTION public.get_user_rank(p_user_id uuid, p_season_id integer DEFAULT NULL::integer)
RETURNS TABLE(rank_position bigint, total_score integer, games_played integer,
              ranked_mmr integer, total_players bigint)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  user_score INTEGER;
  user_season INTEGER;
BEGIN
  -- All-time (sentinel 0): lifetime rank from profiles.
  IF p_season_id = 0 THEN
    RETURN QUERY
    WITH ranked AS (
      SELECT pr.id,
             COALESCE(pr.total_score, 0) AS t_score,
             COALESCE(pr.total_games, 0) AS g_played,
             COALESCE(pr.ranked_mmr, 1000) AS r_mmr,
             ROW_NUMBER() OVER (ORDER BY COALESCE(pr.total_score, 0) DESC,
                                         COALESCE(pr.total_games, 0) DESC) AS pos
      FROM profiles pr
      WHERE COALESCE(pr.total_score, 0) > 0
    )
    SELECT r.pos, r.t_score, r.g_played, r.r_mmr,
           (SELECT COUNT(*) FROM profiles pp WHERE COALESCE(pp.total_score, 0) > 0)::BIGINT
    FROM ranked r
    WHERE r.id = p_user_id;
    RETURN;
  END IF;

  -- Pick the season to rank within: explicit param, else the player's current row.
  IF p_season_id IS NOT NULL THEN
    user_season := p_season_id;
    SELECT l.total_score INTO user_score
    FROM public.leaderboard l
    WHERE l.player_id = p_user_id AND l.season_id = user_season
    LIMIT 1;
  ELSE
    SELECT l.total_score, l.season_id INTO user_score, user_season
    FROM public.leaderboard l
    WHERE l.player_id = p_user_id
    ORDER BY l.season_id DESC
    LIMIT 1;
  END IF;

  IF user_score IS NULL THEN
    RETURN QUERY
    SELECT
      NULL::BIGINT, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER,
      (SELECT COUNT(*) FROM public.leaderboard l2
       WHERE l2.season_id = COALESCE(user_season, (SELECT MAX(l3.season_id) FROM public.leaderboard l3)))::BIGINT;
    RETURN;
  END IF;

  RETURN QUERY
  WITH ranked AS (
    SELECT
      l.player_id,
      l.total_score AS t_score,
      l.games_played AS g_played,
      l.ranked_mmr AS r_mmr,
      ROW_NUMBER() OVER (ORDER BY l.total_score DESC) AS pos
    FROM public.leaderboard l
    WHERE l.season_id = user_season
  )
  SELECT
    r.pos, r.t_score, r.g_played, r.r_mmr,
    (SELECT COUNT(*) FROM public.leaderboard l4 WHERE l4.season_id = user_season)::BIGINT
  FROM ranked r
  WHERE r.player_id = p_user_id;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- get_user_tier_position: 0 = all-time lifetime from profiles (else season rows)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_tier_position(p_user_id uuid, p_season_id integer DEFAULT NULL::integer)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $function$
  WITH src AS (
    -- All-time lifetime from profiles
    SELECT pr.id AS player_id, NULLIF(pr.display_name, '') AS display_name,
           COALESCE(pr.total_score, 0) AS total_score, pr.avatar_image, pr.avatar_config
    FROM profiles pr
    WHERE p_season_id = 0 AND COALESCE(pr.total_score, 0) > 0
    UNION ALL
    -- Season-scoped from leaderboard (current season when NULL, else the given one)
    SELECT l.player_id, l.display_name, l.total_score, l.avatar_image, l.avatar_config
    FROM leaderboard l
    WHERE (p_season_id IS DISTINCT FROM 0)
      AND (p_season_id IS NULL OR l.season_id = p_season_id)
  ),
  ranked AS (
    SELECT
      s.player_id,
      s.display_name,
      s.total_score,
      s.avatar_image,
      s.avatar_config,
      CASE
        WHEN s.total_score >= 200000 THEN 'grandmaster'
        WHEN s.total_score >=  80000 THEN 'diamond'
        WHEN s.total_score >=  30000 THEN 'platinum'
        WHEN s.total_score >=  10000 THEN 'gold'
        WHEN s.total_score >=   2500 THEN 'silver'
        WHEN s.total_score >=    500 THEN 'bronze'
        ELSE 'stone'
      END AS tier_id,
      RANK() OVER (
        PARTITION BY (CASE
          WHEN s.total_score >= 200000 THEN 'grandmaster'
          WHEN s.total_score >=  80000 THEN 'diamond'
          WHEN s.total_score >=  30000 THEN 'platinum'
          WHEN s.total_score >=  10000 THEN 'gold'
          WHEN s.total_score >=   2500 THEN 'silver'
          WHEN s.total_score >=    500 THEN 'bronze'
          ELSE 'stone' END)
        ORDER BY s.total_score DESC
      ) AS rank_in_tier
    FROM src s
  ),
  user_row AS (
    SELECT * FROM ranked WHERE player_id = p_user_id LIMIT 1
  ),
  pop AS (
    SELECT tier_id, COUNT(*)::int AS tier_population
    FROM ranked
    WHERE tier_id = (SELECT tier_id FROM user_row)
    GROUP BY tier_id
  ),
  neighbors AS (
    SELECT player_id, display_name, total_score, avatar_image, avatar_config, rank_in_tier
    FROM ranked
    WHERE tier_id = (SELECT tier_id FROM user_row)
      AND rank_in_tier BETWEEN
        GREATEST(1, (SELECT rank_in_tier FROM user_row) - 2)
        AND (SELECT rank_in_tier FROM user_row) + 2
    ORDER BY rank_in_tier
  )
  SELECT
    CASE WHEN (SELECT player_id FROM user_row) IS NULL THEN NULL
    ELSE jsonb_build_object(
      'tier_id',         (SELECT tier_id FROM user_row),
      'rank_in_tier',    (SELECT rank_in_tier FROM user_row),
      'tier_population', (SELECT tier_population FROM pop),
      'neighbors',       COALESCE((SELECT jsonb_agg(neighbors.*) FROM neighbors), '[]'::jsonb)
    )
    END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill: recompute current-season leaderboard rows from the derivation so the
-- daily-mode score gap is corrected for existing players. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────
WITH cur AS (
  SELECT COALESCE(public.get_current_season_id(), 1) AS sid
),
priors AS (
  -- Per prior season: its archived final, and the carry that final baked in
  -- (10% of the immediately-preceding season's final, 0 if no such row).
  SELECT
    a.player_id,
    SUM(a.total_score)  AS sum_score,
    SUM(a.games_played) AS sum_games,
    SUM(a.games_won)    AS sum_won,
    SUM(FLOOR(0.10 * COALESCE(prev.total_score, 0))) AS sum_carries,
    MAX(a.total_score) FILTER (WHERE a.season_id = (SELECT sid FROM cur) - 1) AS prev_final
  FROM season_leaderboards a
  LEFT JOIN season_leaderboards prev
    ON prev.player_id = a.player_id AND prev.season_id = a.season_id - 1
  WHERE a.season_id < (SELECT sid FROM cur)
  GROUP BY a.player_id
)
UPDATE leaderboard lb
SET
  -- carry head-start + this season's REAL new earnings. Subtract real prior
  -- earnings (finals minus their baked-in carries), not the carry-inflated
  -- finals, so multi-season players aren't understated. Matches updateLeaderboardEntry.
  total_score = FLOOR(0.10 * COALESCE(pr.prev_final, 0))
    + GREATEST(0, COALESCE(p.total_score, 0)
        - (COALESCE(pr.sum_score, 0) - COALESCE(pr.sum_carries, 0))),
  games_played = GREATEST(0, COALESCE(p.total_games, 0) - COALESCE(pr.sum_games, 0)),
  games_won = LEAST(
    GREATEST(0, COALESCE(p.total_games, 0) - COALESCE(pr.sum_games, 0)),
    GREATEST(0, (COALESCE(p.casual_wins, 0) + COALESCE(p.ranked_wins, 0)) - COALESCE(pr.sum_won, 0))
  ),
  display_name = p.display_name,
  username = p.username,
  last_updated = now()
FROM profiles p
LEFT JOIN priors pr ON pr.player_id = p.id
WHERE lb.player_id = p.id
  AND lb.season_id = (SELECT sid FROM cur);
