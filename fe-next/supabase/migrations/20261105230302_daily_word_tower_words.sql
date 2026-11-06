-- Today's daily players become wreckable rivals: keep the words of each
-- player's best climb so the results screen can draw (and smash) their tower.
ALTER TABLE public.daily_word_tower_attempts
  ADD COLUMN IF NOT EXISTS tower_words text[];

CREATE OR REPLACE VIEW public.daily_word_tower_leaderboard
WITH (security_invoker = on, security_barrier = on) AS
 SELECT dwt.puzzle_date,
    dwt.language,
    dwt.player_id,
    dwt.guest_fingerprint,
    COALESCE(p.display_name, dwt.display_name, 'Guest Player'::text) AS display_name,
    COALESCE(p.avatar_emoji, dwt.avatar_emoji, '🏗️'::text) AS avatar_emoji,
    COALESCE(p.avatar_color, dwt.avatar_color, '#6366f1'::text) AS avatar_color,
    p.avatar_config AS custom_avatar,
    COALESCE(p.country_code, dwt.country_code) AS country_code,
    dwt.best_height_m,
    dwt.floors,
    dwt.longest_word,
    dwt.completed_at,
    row_number() OVER (PARTITION BY dwt.puzzle_date, dwt.language ORDER BY dwt.best_height_m DESC, dwt.floors DESC, dwt.completed_at) AS rank_position,
    dwt.tower_words
   FROM daily_word_tower_attempts dwt
     LEFT JOIN profiles p ON dwt.player_id = p.id;
