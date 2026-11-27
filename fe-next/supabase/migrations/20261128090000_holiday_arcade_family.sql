-- Holiday Arcade v2: family party games (Latke Flip, Dreidel Spin-Off,
-- Present Stack, Snowball Splat) share the rounds table and settle function.

ALTER TABLE public.holiday_arcade_rounds DROP CONSTRAINT IF EXISTS holiday_arcade_rounds_game_check;
ALTER TABLE public.holiday_arcade_rounds ADD CONSTRAINT holiday_arcade_rounds_game_check
  CHECK (game IN ('oil', 'dreidel', 'sufganiyah', 'sleigh', 'snowball', 'wrap', 'latke', 'spin', 'presents', 'splat'));
