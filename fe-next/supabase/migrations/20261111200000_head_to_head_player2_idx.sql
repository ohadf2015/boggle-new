-- The rival resolver reads a player's head-to-head rows from either side; the
-- unique (player1_id, player2_id) index only covers the player1 side.
CREATE INDEX IF NOT EXISTS idx_head_to_head_player2_last_game
  ON public.head_to_head (player2_id, last_game_at DESC);
CREATE INDEX IF NOT EXISTS idx_head_to_head_player1_last_game
  ON public.head_to_head (player1_id, last_game_at DESC);
