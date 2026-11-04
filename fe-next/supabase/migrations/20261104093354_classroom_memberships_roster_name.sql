-- A teacher-given name for a student in one class; the student's own profiles.display_name stays untouched.
ALTER TABLE public.classroom_memberships
  ADD COLUMN IF NOT EXISTS roster_name text
  CONSTRAINT classroom_memberships_roster_name_check
  CHECK (roster_name IS NULL OR char_length(btrim(roster_name)) BETWEEN 1 AND 40);
