-- =============================================
-- Leaderboard correctness: RLS-blocked reads, missing avatars, zero-score noise
-- Migration: 20260812210000_fix_leaderboard_rpcs_rls_and_avatars
--
-- `public.profiles` is SELECT-restricted to the caller's OWN row
-- ("Users can read own profile", authenticated only; anon has no SELECT policy
-- at all). Every leaderboard RPC that reads `profiles` is plain SECURITY
-- INVOKER, so those reads silently return zero rows for every visitor —
-- no error, just an empty or truncated board. Measured on prod before this
-- migration, as role `authenticated`:
--
--   get_leaderboard(100, 0, 'total_score', 0)   -> 0 rows   (All-Time tab EMPTY)
--   get_user_rank(<uuid>, 0)                    -> 0 rows   (All-Time rank card gone)
--   get_past_season_leaderboard(4, 50)          -> 50 rows, display_name NULL on ALL
--                                                  (falls back to Player_xxxxxxx)
--
-- The season tab was unaffected (31 rows) because it reads `leaderboard`,
-- which has a public SELECT policy.
--
-- Changes:
-- 1. SECURITY DEFINER on the three read RPCs so the cross-player join actually
--    runs. Every column they expose (username, display_name, avatars, score,
--    games, mmr) is already world-readable on `public.leaderboard` for the
--    current season — this adds no new PII, it restores parity for the
--    all-time and archived views. search_path is pinned on each.
-- 2. get_past_season_leaderboard also returns the avatar columns. The archive
--    table `season_leaderboards` has none, so past-season rows had no avatar
--    to render at all; they now join the player's live avatar from `profiles`.
-- 3. Zero-score rows are excluded from past seasons, matching get_leaderboard's
--    existing `total_score > 0` filter. 398 of 555 archived rows score 0, so
--    e.g. Season 1 listed 13 empty rows below its 22 real players.
--    list_past_seasons counts the same filtered set in the SAME migration —
--    filtering one without the other would put "Season 4 · 292" above 59 rows.
-- 4. get_user_rank ranks over the same filtered set and the same tie-break as
--    get_leaderboard, so "You are #180" can no longer sit above a 31-row board.
-- =============================================

-- =============================================
-- 1. get_leaderboard — all-time branch reads `profiles`
-- =============================================

ALTER FUNCTION public.get_leaderboard(integer, integer, text, integer)
    SECURITY DEFINER;

COMMENT ON FUNCTION public.get_leaderboard(integer, integer, text, integer) IS
    'Season/all-time leaderboard. SECURITY DEFINER: the all-time branch (p_season_id = 0) reads public.profiles, which is own-row-only under RLS. Exposes only columns already public on public.leaderboard.';

-- =============================================
-- 2. get_user_rank — all-time branch reads `profiles`;
--    season branch must match get_leaderboard's filter + tie-break
-- =============================================

CREATE OR REPLACE FUNCTION public.get_user_rank(
    p_user_id uuid,
    p_season_id integer DEFAULT NULL::integer
)
RETURNS TABLE(
    rank_position bigint,
    total_score integer,
    games_played integer,
    ranked_mmr integer,
    total_players bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_score INTEGER;
  user_season INTEGER;
BEGIN
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

  -- A 0-score row exists for every player who ever touched the game but has not
  -- scored this season. They are not ON the board (get_leaderboard filters them
  -- out), so report them as unranked rather than inventing a rank.
  IF user_score IS NULL OR user_score <= 0 THEN
    RETURN QUERY
    SELECT
      NULL::BIGINT, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER,
      (SELECT COUNT(*) FROM public.leaderboard l2
       WHERE l2.season_id = COALESCE(user_season, (SELECT MAX(l3.season_id) FROM public.leaderboard l3))
         AND COALESCE(l2.total_score, 0) > 0)::BIGINT;
    RETURN;
  END IF;

  RETURN QUERY
  WITH ranked AS (
    SELECT
      l.player_id,
      l.total_score AS t_score,
      l.games_played AS g_played,
      l.ranked_mmr AS r_mmr,
      ROW_NUMBER() OVER (ORDER BY l.total_score DESC, l.games_played DESC) AS pos
    FROM public.leaderboard l
    WHERE l.season_id = user_season
      AND COALESCE(l.total_score, 0) > 0
  )
  SELECT
    r.pos, r.t_score, r.g_played, r.r_mmr,
    (SELECT COUNT(*) FROM public.leaderboard l4
     WHERE l4.season_id = user_season AND COALESCE(l4.total_score, 0) > 0)::BIGINT
  FROM ranked r
  WHERE r.player_id = p_user_id;
END;
$function$;

COMMENT ON FUNCTION public.get_user_rank(uuid, integer) IS
    'Player rank for a season (NULL = latest) or all-time (0). SECURITY DEFINER: the all-time branch reads own-row-only public.profiles. Ranks over the same total_score > 0 set and the same tie-break as get_leaderboard so the rank card agrees with the visible board.';

-- =============================================
-- 3. get_past_season_leaderboard — avatars + no zero-score tail
-- =============================================

DROP FUNCTION IF EXISTS public.get_past_season_leaderboard(integer, integer);

CREATE FUNCTION public.get_past_season_leaderboard(
    p_season_id integer,
    p_limit integer DEFAULT 50
)
RETURNS TABLE(
    player_id uuid,
    username text,
    display_name text,
    total_score integer,
    games_played integer,
    games_won integer,
    ranked_mmr integer,
    rank_position integer,
    peak_tier text,
    avatar_emoji text,
    avatar_color text,
    avatar_image text,
    avatar_config jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT sl.player_id,
         sl.username,
         COALESCE(NULLIF(sl.display_name, ''), p.display_name) AS display_name,
         sl.total_score, sl.games_played, sl.games_won,
         sl.ranked_mmr, sl.rank_position, sl.peak_tier,
         -- season_leaderboards archives no avatar, so show the player's current one
         p.avatar_emoji, p.avatar_color, p.avatar_image, p.avatar_config
    FROM season_leaderboards sl
    LEFT JOIN profiles p ON p.id = sl.player_id
   WHERE sl.season_id = p_season_id
     AND COALESCE(sl.total_score, 0) > 0
   ORDER BY sl.rank_position ASC
   LIMIT p_limit;
$function$;

COMMENT ON FUNCTION public.get_past_season_leaderboard(integer, integer) IS
    'Archived season board. SECURITY DEFINER: joins own-row-only public.profiles for display_name + avatar, which the archive table does not store. Hides 0-score rows to match get_leaderboard and list_past_seasons.';

GRANT EXECUTE ON FUNCTION public.get_past_season_leaderboard(integer, integer) TO anon, authenticated;

-- =============================================
-- 4. list_past_seasons — count only the players actually shown
-- =============================================

CREATE OR REPLACE FUNCTION public.list_past_seasons()
RETURNS TABLE(
    season_id integer,
    name text,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    entry_count bigint
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT s.id AS season_id, s.name, s.start_date, s.end_date, COUNT(sl.player_id) AS entry_count
  FROM seasons s
  JOIN season_leaderboards sl
    ON sl.season_id = s.id
   AND COALESCE(sl.total_score, 0) > 0
  GROUP BY s.id, s.name, s.start_date, s.end_date
  HAVING COUNT(sl.player_id) > 0
  ORDER BY s.id DESC;
$function$;

COMMENT ON FUNCTION public.list_past_seasons() IS
    'Past seasons that have at least one scoring player. entry_count counts the same total_score > 0 set get_past_season_leaderboard renders, so the badge matches the row count.';
