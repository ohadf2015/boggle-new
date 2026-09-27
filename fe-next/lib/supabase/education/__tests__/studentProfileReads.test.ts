import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Every teacher-facing screen that names a student read `public.profiles` from the
 * browser's user-scoped client. RLS on that table is own-row-only, so those reads returned
 * ZERO rows with `error: null` — indistinguishable from "this classroom has no students".
 * Verified live: as the teacher who owns the one existing classroom,
 * `select from profiles where id = <their student>` → 0 rows, while the same probe against
 * `public_profiles` → 1 row.
 *
 * The visible result was a roster of students with `profiles: null`: no name, and (per the
 * Avatar contract — null config with no userId renders a skeleton forever) no face either,
 * on the roster, both classroom leaderboards, assignment tracking, the analytics dashboard
 * and both printed reports.
 *
 * `public_profiles` is the existing read-side view of the same rows, already used by
 * friends, quick-play and the referral surfaces for exactly this reason. It exposes
 * username, display_name, avatar_config, avatar_emoji and avatar_color — every column
 * these call sites select.
 *
 * This test pins the table name at each site, because the failure mode is silent: swapping
 * one back would look like an empty classroom, not like an error.
 */

/** Records every `.from(table)` and lets any chain shape resolve to a non-empty result. */
const tables: string[] = [];

/**
 * Every one of these functions bails early on an empty membership list, so a mock that
 * resolves to `[]` never reaches the profile read and the assertion passes vacuously — the
 * same shape of false negative this whole bug is made of. So resolve with one row that is
 * simultaneously array-like (for `.select()` list reads) and carries the row's own fields
 * (for `.single()` / `.maybeSingle()` reads), which the chain proxy cannot tell apart.
 */
const ROW = {
  id: 'x-1',
  student_id: 's-1',
  classroom_id: 'c-1',
  assignment_id: 'a-1',
  lesson_id: 'l-1',
  teacher_id: 'teacher-1',
  language: 'en',
  joined_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  completed_at: '2026-01-01T00:00:00Z',
  words: ['alpha'],
  score: 1,
};
const RESULT = () => ({ data: Object.assign([{ ...ROW }], ROW), error: null, count: 1 });

const chainable = (): unknown =>
  new Proxy(function () {} as unknown as Record<string, unknown>, {
    get(_t, prop) {
      if (prop === 'then') return (resolve: (v: unknown) => unknown) => resolve(RESULT());
      return () => chainable();
    },
    apply: () => chainable(),
  });

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      tables.push(table);
      return chainable();
    },
  },
}));

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { getClassroomStudents } from '../classrooms';
import { getClassroomLeaderboard, getFullClassroomLeaderboard } from '../leaderboard';
import { getAssignmentCompletions } from '../assignments';
import { getStudentsProgressSummary } from '../../analyticsClassroom';
import { getStudentReportData, getClassReportData, getVocabularyHeatmapData } from '../../analyticsReports';

const cases: Array<[string, () => Promise<unknown>]> = [
  ['getClassroomStudents (roster)', () => getClassroomStudents('c-1')],
  ['getClassroomLeaderboard', () => getClassroomLeaderboard('c-1', 'teacher-1')],
  ['getFullClassroomLeaderboard', () => getFullClassroomLeaderboard('c-1', 'teacher-1')],
  ['getAssignmentCompletions', () => getAssignmentCompletions('a-1')],
  ['getStudentsProgressSummary (analytics)', () => getStudentsProgressSummary('c-1')],
  ['getStudentReportData', () => getStudentReportData('s-1', 'c-1')],
  ['getClassReportData', () => getClassReportData('c-1')],
  ['getVocabularyHeatmapData', () => getVocabularyHeatmapData('c-1')],
];

describe('teacher-facing student profile reads go through public_profiles', () => {
  beforeEach(() => {
    tables.length = 0;
  });

  it.each(cases)('%s never reads the RLS-blind profiles table', async (_name, run) => {
    await run();

    expect(tables).not.toContain('profiles');
  });
});
