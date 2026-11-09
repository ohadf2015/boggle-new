-- How much of the class standings students see in their Academy "Class" sheet.
-- Teacher-picked per class. 'top3' (top three plus your own row) is the friendly
-- default for kids: the podium still motivates, and nobody sees themselves as
-- 27th of 28. 'full' is the old behaviour; 'personal_only' shows only your own
-- row; 'hidden' turns the standings off.
-- Display control, not an access boundary: classmates' XP rows stay readable
-- under the existing membership RLS.
ALTER TABLE public.classrooms
  ADD COLUMN IF NOT EXISTS leaderboard_visibility text NOT NULL DEFAULT 'top3'
  CONSTRAINT classrooms_leaderboard_visibility_check
  CHECK (leaderboard_visibility IN ('full', 'top3', 'personal_only', 'hidden'));
