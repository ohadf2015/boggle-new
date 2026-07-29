-- Returns the user's rank within their tier, tier population, and 5 neighbors
-- (2 above + user + 2 below). Tier is derived from total_score using the same
-- thresholds as fe-next/lib/ranked/leaderboardTiers.ts.
--
-- Args:
--   p_user_id    : uuid of the player to look up
--   p_season_id  : optional season filter; NULL means "all seasons"
--
-- Returns: jsonb shape
--   {
--     "tier_id":         "gold",
--     "rank_in_tier":    12,
--     "tier_population": 487,
--     "neighbors": [
--       { "player_id":..., "display_name":..., "total_score":...,
--         "avatar_image":..., "avatar_config":..., "rank_in_tier": 10 },
--       ...
--     ]
--   }
-- or NULL if the user is not on the leaderboard.

CREATE OR REPLACE FUNCTION get_user_tier_position(
  p_user_id uuid,
  p_season_id int DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  WITH ranked AS (
    SELECT
      l.player_id,
      l.display_name,
      l.total_score,
      l.avatar_image,
      l.avatar_config,
      CASE
        WHEN l.total_score >= 200000 THEN 'grandmaster'
        WHEN l.total_score >=  80000 THEN 'diamond'
        WHEN l.total_score >=  30000 THEN 'platinum'
        WHEN l.total_score >=  10000 THEN 'gold'
        WHEN l.total_score >=   2500 THEN 'silver'
        WHEN l.total_score >=    500 THEN 'bronze'
        ELSE 'stone'
      END AS tier_id,
      RANK() OVER (
        PARTITION BY (CASE
          WHEN l.total_score >= 200000 THEN 'grandmaster'
          WHEN l.total_score >=  80000 THEN 'diamond'
          WHEN l.total_score >=  30000 THEN 'platinum'
          WHEN l.total_score >=  10000 THEN 'gold'
          WHEN l.total_score >=   2500 THEN 'silver'
          WHEN l.total_score >=    500 THEN 'bronze'
          ELSE 'stone' END)
        ORDER BY l.total_score DESC
      ) AS rank_in_tier
    FROM leaderboard l
    WHERE p_season_id IS NULL OR l.season_id = p_season_id
  ),
  user_row AS (
    SELECT * FROM ranked WHERE player_id = p_user_id
    LIMIT 1
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
$$;

GRANT EXECUTE ON FUNCTION get_user_tier_position(uuid, int) TO authenticated, anon;

COMMENT ON FUNCTION get_user_tier_position IS
  'Tier-relative rank + 5-neighbor window for the user-rank card on /leaderboard. Tier thresholds mirror fe-next/lib/ranked/leaderboardTiers.ts.';
