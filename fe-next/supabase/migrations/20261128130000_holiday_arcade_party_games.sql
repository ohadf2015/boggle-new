-- Holiday Arcade is family party games only: three per holiday.
-- No word-game round was ever stored, so the old ids are dropped.

ALTER TABLE public.holiday_arcade_rounds DROP CONSTRAINT IF EXISTS holiday_arcade_rounds_game_check;
ALTER TABLE public.holiday_arcade_rounds ADD CONSTRAINT holiday_arcade_rounds_game_check
  CHECK (game IN ('latke', 'spin', 'catch', 'presents', 'splat', 'dash'));
