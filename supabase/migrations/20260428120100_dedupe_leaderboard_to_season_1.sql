-- One-shot data fix: collapse duplicate leaderboard rows that the broken
-- sync_profile_to_leaderboard trigger sprayed across pre-seeded seasons 2-5
-- back into a single Season 1 row per player. The newest row wins on every
-- column. Idempotent: no-op once duplicates are gone.

WITH latest AS (
  SELECT DISTINCT ON (player_id)
    player_id, username, display_name, avatar_emoji, avatar_color,
    avatar_image, profile_picture_url, avatar_config,
    total_score, games_played, games_won, ranked_mmr,
    score, total_xp, current_level, last_updated, season_id
  FROM leaderboard
  ORDER BY player_id, last_updated DESC NULLS LAST, season_id DESC
)
UPDATE leaderboard l
SET total_score = latest.total_score,
    games_played = latest.games_played,
    games_won = latest.games_won,
    ranked_mmr = latest.ranked_mmr,
    score = latest.score,
    total_xp = latest.total_xp,
    current_level = latest.current_level,
    username = latest.username,
    display_name = latest.display_name,
    avatar_emoji = latest.avatar_emoji,
    avatar_color = latest.avatar_color,
    avatar_image = latest.avatar_image,
    profile_picture_url = latest.profile_picture_url,
    avatar_config = latest.avatar_config,
    last_updated = latest.last_updated
FROM latest
WHERE l.player_id = latest.player_id
  AND l.season_id = 1
  AND latest.season_id <> 1;

INSERT INTO leaderboard (
  player_id, username, display_name, avatar_emoji, avatar_color,
  avatar_image, profile_picture_url, avatar_config,
  total_score, games_played, games_won, ranked_mmr,
  score, total_xp, current_level, last_updated, season_id
)
SELECT DISTINCT ON (lb.player_id)
  lb.player_id, lb.username, lb.display_name, lb.avatar_emoji, lb.avatar_color,
  lb.avatar_image, lb.profile_picture_url, lb.avatar_config,
  lb.total_score, lb.games_played, lb.games_won, lb.ranked_mmr,
  lb.score, lb.total_xp, lb.current_level, lb.last_updated, 1
FROM leaderboard lb
WHERE NOT EXISTS (
  SELECT 1 FROM leaderboard s1 WHERE s1.player_id = lb.player_id AND s1.season_id = 1
)
ORDER BY lb.player_id, lb.last_updated DESC NULLS LAST, lb.season_id DESC
ON CONFLICT (player_id, season_id) DO NOTHING;

DELETE FROM leaderboard WHERE season_id <> 1;
