-- Streak/chest reads filter connections_daily_scores by player_id alone, but the
-- only player-keyed index leads with puzzle_date, so each call bitmap-scans by date.
-- CONCURRENTLY: zero table lock, safe on a live instance.
CREATE INDEX CONCURRENTLY IF NOT EXISTS connections_daily_scores_player_idx
  ON public.connections_daily_scores (player_id, puzzle_date);
