-- =============================================
-- Word Bridge daily leaderboard: real avatars + non-stale names
-- Migration: 20260812211000_connections_leaderboard_custom_avatar
--
-- `connections_daily_leaderboard` exposed avatar_emoji/avatar_color/avatar_image
-- but not `avatar_config` — the ONLY field `components/Avatar` renders. The board
-- therefore drew a coloured emoji chip while every other leaderboard in the app
-- drew the player's built avatar.
--
-- Its display_name/emoji/colour were also read straight off the score row, which
-- snapshots them at solve time, so a rename or avatar change never reached the
-- board. Mirrors the pattern already used by `daily_word_wheel_leaderboard`:
-- COALESCE(live profile, snapshot, guest default).
--
-- player_id is deliberately NOT exposed — the API route documents that this
-- endpoint leaks no identifiers, and the client seeds its fallback on the name.
-- =============================================

-- DROP + CREATE, not CREATE OR REPLACE: custom_avatar is inserted mid-list and
-- Postgres rejects that with 42P16 "cannot change name of view column".
-- The GRANTs must be re-issued because DROP takes them with it — the API route
-- reads this through createAdminClient(), so service_role matters too.
DROP VIEW IF EXISTS public.connections_daily_leaderboard;

CREATE VIEW public.connections_daily_leaderboard AS
SELECT
    s.puzzle_date,
    COALESCE(p.display_name, s.display_name, 'Guest Player'::text) AS display_name,
    COALESCE(p.avatar_emoji, s.avatar_emoji, '🎯'::text)           AS avatar_emoji,
    COALESCE(p.avatar_color, s.avatar_color, '#6366f1'::text)      AS avatar_color,
    COALESCE(p.avatar_image, s.avatar_image)                       AS avatar_image,
    p.avatar_config                                                AS custom_avatar,
    s.score,
    s.time_taken_seconds,
    s.streak,
    s.puzzles_solved,
    s.language,
    s.created_at,
    row_number() OVER (
      PARTITION BY s.puzzle_date
      ORDER BY s.score DESC, s.time_taken_seconds, s.created_at
    ) AS rank_position
FROM connections_daily_scores s
LEFT JOIN profiles p ON p.id = s.player_id;

COMMENT ON VIEW public.connections_daily_leaderboard IS
    'Word Bridge daily board. Joins profiles for the live name + avatar_config (exposed as custom_avatar) because the score row only snapshots them. No player_id — this feeds an endpoint that leaks no identifiers.';

GRANT SELECT ON public.connections_daily_leaderboard TO anon, authenticated, service_role;
