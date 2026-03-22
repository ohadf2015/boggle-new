-- Spaced Repetition (SM-2) - Word Review State
-- Persists per-student, per-lesson word review schedules for the education system.
-- Replaces localStorage-only storage so teachers have visibility and data syncs across devices.

-- Enable moddatetime extension for auto-updating updated_at timestamps
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

CREATE TABLE IF NOT EXISTS word_review_state (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES vocabulary_lessons(id) ON DELETE CASCADE,
  word text NOT NULL,
  ease_factor numeric(4,2) NOT NULL DEFAULT 2.5,
  interval integer NOT NULL DEFAULT 1,
  repetitions integer NOT NULL DEFAULT 0,
  next_review_date date NOT NULL DEFAULT CURRENT_DATE,
  last_review_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT word_review_state_unique UNIQUE (student_id, lesson_id, word),
  CONSTRAINT ease_factor_range CHECK (ease_factor >= 1.3 AND ease_factor <= 5.0),
  CONSTRAINT interval_positive CHECK (interval >= 1),
  CONSTRAINT repetitions_non_negative CHECK (repetitions >= 0)
);

-- Indexes for common queries
CREATE INDEX idx_word_review_state_student_lesson
  ON word_review_state(student_id, lesson_id);

CREATE INDEX idx_word_review_state_due_date
  ON word_review_state(student_id, next_review_date);

-- Auto-update updated_at on row changes
CREATE TRIGGER word_review_state_updated_at
  BEFORE UPDATE ON word_review_state
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- RLS
ALTER TABLE word_review_state ENABLE ROW LEVEL SECURITY;

-- Students can read/write their own review data
CREATE POLICY "Students can view own review data"
  ON word_review_state FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own review data"
  ON word_review_state FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own review data"
  ON word_review_state FOR UPDATE
  USING (auth.uid() = student_id);

-- Teachers can read review data for students in their classrooms
CREATE POLICY "Teachers can view student review data"
  ON word_review_state FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vocabulary_lessons vl
      WHERE vl.id = word_review_state.lesson_id
        AND vl.teacher_id = auth.uid()
    )
  );

-- Service role has full access
CREATE POLICY "Service role full access"
  ON word_review_state FOR ALL
  USING (auth.role() = 'service_role');
