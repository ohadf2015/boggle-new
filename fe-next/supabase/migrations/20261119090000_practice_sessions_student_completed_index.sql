-- Daily practice XP cap: reads one student recent sessions on every completion.
CREATE INDEX IF NOT EXISTS idx_practice_sessions_student_completed
  ON public.practice_sessions (student_id, completed_at);
