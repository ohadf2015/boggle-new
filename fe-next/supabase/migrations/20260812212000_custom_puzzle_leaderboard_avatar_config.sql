-- =============================================
-- Custom-puzzle leaderboard: supply the avatar the component already asks for
-- Migration: 20260812212000_custom_puzzle_leaderboard_avatar_config
--
-- `custom_puzzle_leaderboard` exposed avatar_emoji/avatar_color/avatar_image but
-- not `avatar_config` — the ONLY field `components/Avatar` renders.
-- `CustomChallengeStats` already reads `entry.avatar_config`; the column was
-- simply never supplied, so every solver drew a stand-in face.
--
-- Name/emoji/colour now prefer the live profile over the attempt-time snapshot,
-- matching `daily_word_wheel_leaderboard`.
--
-- avatar_config is appended LAST on purpose: CREATE OR REPLACE VIEW cannot
-- insert a column mid-list ("cannot change name of view column"), and every
-- consumer selects '*'.
-- =============================================

CREATE OR REPLACE VIEW public.custom_puzzle_leaderboard AS
SELECT cp.puzzle_code,
    cpa.player_id,
    cpa.guest_fingerprint,
    COALESCE(p.display_name, cpa.display_name) AS display_name,
    COALESCE(p.avatar_emoji, cpa.avatar_emoji) AS avatar_emoji,
    COALESCE(p.avatar_color, cpa.avatar_color) AS avatar_color,
    COALESCE(p.avatar_image, cpa.avatar_image) AS avatar_image,
    cpa.profile_picture_url,
    cpa.country_code,
    cpa.solved,
    cpa.attempts_used,
    cpa.efficiency_score,
    cpa.words_discovered,
    cpa.life_remaining,
    cpa.completed_at,
    row_number() OVER (
      PARTITION BY cp.puzzle_code
      ORDER BY cpa.solved DESC, cpa.efficiency_score DESC NULLS LAST, cpa.attempts_used, cpa.completed_at
    ) AS rank_position,
    p.avatar_config
   FROM custom_puzzle_attempts cpa
     JOIN custom_puzzles cp ON cp.id = cpa.puzzle_id
     LEFT JOIN profiles p ON p.id = cpa.player_id
  WHERE cpa.solved = true;

COMMENT ON VIEW public.custom_puzzle_leaderboard IS
    'Custom-puzzle solvers. Joins profiles for avatar_config (the only field Avatar renders) plus the live name/avatar, which the attempt row only snapshots.';
