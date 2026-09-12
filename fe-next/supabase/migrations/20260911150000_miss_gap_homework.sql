-- Miss-gap async homework: server-side completions + class streak.
--
-- Before this, finishing homework was a localStorage boolean on one device and
-- the "class streak" was a number in that same browser. A student who finished
-- on their phone was invisible to the teacher, and clearing site data erased a
-- three-week class streak. Two tables fix both:
--
--   miss_gap_homework_runs   one row per student per assignment (upserted; the
--                            route merges achievement columns via
--                            lib/education/missGapRunMerge so a replay can only
--                            improve the row, never downgrade it)
--   miss_gap_class_streaks   one row per class key, the streak of consecutive
--                            calendar days on which at least one student finished
--
-- Identity: `class_key` is `lesson::teacher` (already used by the share link), so
-- a homework link works with no classroom row and no student account. Guests are
-- identified by a device key they generate themselves; members by auth user id.
-- Only a display name is stored — never an email, never a roster.
--
-- RLS is ON with NO policies on purpose: every read and write goes through
-- /api/education/miss-gap/* with the service-role client, which applies the
-- authorization the product wants (names only for a signed-in caller). A leaked
-- anon key therefore reads nothing here.
--
-- Not added to the `supabase_realtime` publication — no consumer subscribes
-- (see .claude/rules/50-supabase-perf.md).

CREATE TABLE IF NOT EXISTS public.miss_gap_homework_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_key text NOT NULL,
  -- '' when the teacher assigned no due date; kept non-null so the unique
  -- constraint below works with a plain column list (supabase-js upsert).
  due_key text NOT NULL DEFAULT '',
  due_date date,
  lesson text,
  teacher text,
  student_key text NOT NULL,
  student_name text NOT NULL DEFAULT '',
  player_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_guest boolean NOT NULL DEFAULT true,
  words_total integer NOT NULL DEFAULT 0,
  words_correct integer NOT NULL DEFAULT 0,
  accuracy integer NOT NULL DEFAULT 0,
  stars integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  on_time boolean NOT NULL DEFAULT false,
  completed_on date NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT miss_gap_homework_runs_one_per_student
    UNIQUE (class_key, due_key, student_key)
);

CREATE INDEX IF NOT EXISTS miss_gap_homework_runs_class_idx
  ON public.miss_gap_homework_runs (class_key, due_key, completed_at DESC);

CREATE TABLE IF NOT EXISTS public.miss_gap_class_streaks (
  class_key text PRIMARY KEY,
  lesson text,
  teacher text,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_completion_date date,
  -- YYYY-MM-DD strings, ascending, capped by the API at 120 entries.
  completion_days text[] NOT NULL DEFAULT '{}',
  total_completions integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.miss_gap_homework_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miss_gap_class_streaks ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.miss_gap_homework_runs IS
  'One row per student per miss-gap homework assignment. Service-role only; see app/api/education/miss-gap/*.';
COMMENT ON TABLE public.miss_gap_class_streaks IS
  'Consecutive calendar days on which at least one student finished the class homework. Service-role only.';
