export interface StreakRow {
  class_key: string;
  current_streak: number;
  longest_streak: number;
  last_completion_date: string | null;
  completion_days: string[];
  total_completions: number;
}

/** Two runs for the 2026-09-12 assignment, one for a later one, so "whole class" and "one due date" differ. */
export const RUNS = [
  {
    class_key: 'week 3 vocab::ms. g',
    due_key: '2026-09-12',
    student_name: 'Maya',
    student_key: 'g:maya',
    stars: 3,
    accuracy: 100,
    words_correct: 8,
    words_total: 8,
    best_streak: 8,
    duration_ms: 91000,
    on_time: true,
    is_guest: true,
    completed_at: '2026-09-11T09:00:00.000Z',
  },
  {
    class_key: 'week 3 vocab::ms. g',
    due_key: '2026-09-12',
    student_name: 'Noah',
    student_key: 'g:noah',
    stars: 2,
    accuracy: 75,
    words_correct: 6,
    words_total: 8,
    best_streak: 4,
    duration_ms: 120000,
    on_time: true,
    is_guest: true,
    completed_at: '2026-09-11T09:20:00.000Z',
  },
  {
    class_key: 'week 3 vocab::ms. g',
    due_key: '2026-09-19',
    student_name: 'Ada',
    student_key: 'g:ada',
    stars: 3,
    accuracy: 100,
    words_correct: 8,
    words_total: 8,
    best_streak: 8,
    duration_ms: 80000,
    on_time: true,
    is_guest: true,
    completed_at: '2026-09-18T09:00:00.000Z',
  },
];

export const FIXTURE_SECRET = 'fixture-secret';
/** HMAC-SHA256 over `miss-gap-class:<body>` with FIXTURE_SECRET, computed outside the codebase. */
export const CLASS_TOKEN =
  'eyJjbGFzc0tleSI6IndlZWsgMyB2b2NhYjo6bXMuIGciLCJ2IjoxfQ.rwAXBO0dzz46AypxCnieV8sqNYlAO60DHufYX8Dyihg';
/** Same secret, signed for 'week 4 verbs::ms. g'. */
export const OTHER_CLASS_TOKEN =
  'eyJjbGFzc0tleSI6IndlZWsgNCB2ZXJiczo6bXMuIGciLCJ2IjoxfQ.nrcLKJxXm2cuUS5o4rOkUP4YCuQFeMXzC6MaYtDRhUE';

export const BODY = {
  classKey: 'week 3 vocab::ms. g',
  classToken: CLASS_TOKEN,
  dueDate: '2026-09-12',
  lesson: 'Week 3 Vocab',
  teacher: 'Ms. G',
  studentName: 'Maya',
  studentKey: 'maya-device-1',
  completedOn: '2026-09-11',
  wordsTotal: 8,
  wordsCorrect: 8,
  accuracy: 100,
  stars: 3,
  bestStreak: 8,
  durationMs: 91000,
};

export const state = {
  streakRow: null as StreakRow | null,
  /** The row already filed for this student, if any — drives the replay merge. */
  previousRun: null as Record<string, unknown> | null,
  upsertedRun: null as Record<string, unknown> | null,
  upsertedStreak: null as Record<string, unknown> | null,
  /** Every `.eq(column, value)` the progress route applied to the runs query. */
  runFilters: [] as Array<[string, unknown]>,
  /** The caller's profile as the service role reads it. */
  callerProfile: null as { user_role: string; is_admin: boolean } | null,
  /** class_key → owning teacher, as miss_gap_class_owners stores it. */
  owners: new Map<string, string>(),
  ownerUpserts: [] as Array<{ row: Record<string, unknown>; opts: Record<string, unknown> }>,
  ownerError: null as unknown,
  /** How many students already filed a run for the (class, due) pair being completed. */
  filedStudents: 2,
};

const ORIGINAL_SECRET = process.env.PARENT_REPORT_SECRET;

export function restoreSecret(): void {
  if (ORIGINAL_SECRET === undefined) delete process.env.PARENT_REPORT_SECRET;
  else process.env.PARENT_REPORT_SECRET = ORIGINAL_SECRET;
}

export function resetState(): void {
  process.env.PARENT_REPORT_SECRET = FIXTURE_SECRET;
  state.streakRow = null;
  state.previousRun = null;
  state.upsertedRun = null;
  state.upsertedStreak = null;
  state.runFilters = [];
  state.callerProfile = null;
  state.owners = new Map();
  state.ownerUpserts = [];
  state.ownerError = null;
  state.filedStudents = 2;
}

function ownersTable() {
  return {
    upsert: async (row: { class_key: string; owner_id: string }, opts: Record<string, unknown>) => {
      state.ownerUpserts.push({ row, opts });
      if (state.ownerError) return { error: state.ownerError };
      if (!state.owners.has(row.class_key) || !opts?.ignoreDuplicates) state.owners.set(row.class_key, row.owner_id);
      return { error: null };
    },
    select: () => ({
      eq: (_col: string, key: string) => ({
        maybeSingle: async () =>
          state.ownerError
            ? { data: null, error: state.ownerError }
            : { data: state.owners.has(key) ? { owner_id: state.owners.get(key) } : null, error: null },
      }),
    }),
  };
}

function runsTable() {
  return {
    upsert: (row: Record<string, unknown>) => {
      state.upsertedRun = row;
      return {
        select: () => ({
          single: async () => ({ data: { id: 'run-1', ...row }, error: null }),
        }),
      };
    },
    select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
      if (opts?.count) {
        const counter = {
          eq: () => counter,
          then: (resolve: (v: unknown) => void) => resolve({ count: state.filedStudents, error: null }),
        };
        return counter;
      }
      const filters: Array<[string, unknown]> = [];
      const builder = {
        eq(column: string, value: unknown) {
          filters.push([column, value]);
          return builder;
        },
        order() {
          return builder;
        },
        async maybeSingle() {
          return { data: state.previousRun, error: null };
        },
        async limit() {
          state.runFilters.push(...filters);
          const data = RUNS.filter((row) =>
            filters.every(([column, value]) => (row as Record<string, unknown>)[column] === value),
          );
          return { data, error: null };
        },
      };
      return builder;
    },
  };
}

export function makeClient() {
  return {
    from(table: string) {
      if (table === 'miss_gap_class_owners') return ownersTable();
      if (table === 'miss_gap_homework_runs') return runsTable();
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.callerProfile, error: null }) }) }) };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: state.streakRow, error: null }),
          }),
        }),
        upsert: (row: Record<string, unknown>) => {
          state.upsertedStreak = row;
          return { select: () => ({ single: async () => ({ data: row, error: null }) }) };
        },
      };
    },
  };
}
