import { vi, type Mock } from 'vitest';
import { supabase as _supabase } from '@/lib/supabase';

const supabase = _supabase!;

import { getTeacherExportRows } from '../teacherExportAllClasses';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

/**
 * Builds a `.select(...).eq(col, val)` chain resolving to `rows`.
 */
function eqChain(rows: unknown[] | null, error: { message: string } | null = null) {
  const eq = vi.fn().mockResolvedValue({ data: rows, error });
  const select = vi.fn().mockReturnValue({ eq });
  return { select };
}

/**
 * Builds a `.select(...).in(col, ids).range(from, to)` chain. `pages` lets a
 * test simulate the PostgREST 1000-row page cap by returning more than one
 * page for a single `.in()` call.
 */
function inRangeChain(pages: unknown[][], error: { message: string } | null = null) {
  const rangeCalls: Array<[number, number]> = [];
  let callIndex = 0;
  const range = vi.fn().mockImplementation((from: number, to: number) => {
    rangeCalls.push([from, to]);
    if (error) return Promise.resolve({ data: null, error });
    const page = pages[callIndex] ?? [];
    callIndex += 1;
    return Promise.resolve({ data: page, error: null });
  });
  const inFn = vi.fn().mockReturnValue({ range });
  const select = vi.fn().mockReturnValue({ in: inFn });
  return { select, inFn, range, rangeCalls };
}

describe('getTeacherExportRows', () => {
  const teacherId = 'teacher-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty list without querying anything else when the teacher owns no classrooms', async () => {
    const classroomsChain = eqChain([]);
    (supabase.from as Mock).mockImplementation((table: string) => {
      if (table === 'classrooms') return classroomsChain;
      throw new Error(`unexpected table query: ${table}`);
    });

    const result = await getTeacherExportRows(teacherId);

    expect(result).toEqual({ data: [], error: null });
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.from).toHaveBeenCalledWith('classrooms');
  });

  it('assembles rows end-to-end from a bounded set of queries', async () => {
    const classroomsChain = eqChain([{ id: 'c1', name: 'Grade 5A' }]);
    const memberships = inRangeChain([[{ classroom_id: 'c1', student_id: 's1' }]]);
    const lessonAssignments = inRangeChain([[{ classroom_id: 'c1', lesson_id: 'l1' }]]);
    const profiles = inRangeChain([[{ id: 's1', display_name: 'Ada', username: null }]]);
    const progress = inRangeChain([
      [{ student_id: 's1', lesson_id: 'l1', total_xp: 100, words_mastered: ['a', 'b'], last_practice_date: '2026-09-01', completed_at: '2026-09-01' }],
    ]);
    const sessions = inRangeChain([[{ student_id: 's1', lesson_id: 'l1', completed_at: '2026-09-02' }]]);

    (supabase.from as Mock).mockImplementation((table: string) => {
      switch (table) {
        case 'classrooms': return classroomsChain;
        case 'classroom_memberships': return memberships;
        case 'lesson_assignments': return lessonAssignments;
        case 'public_profiles': return profiles;
        case 'student_lesson_progress': return progress;
        case 'practice_sessions': return sessions;
        default: throw new Error(`unexpected table query: ${table}`);
      }
    });

    const result = await getTeacherExportRows(teacherId);

    expect(result.error).toBeNull();
    expect(result.data).toEqual([
      {
        classroomId: 'c1',
        classroomName: 'Grade 5A',
        studentId: 's1',
        studentName: 'Ada',
        lessonsCompleted: 1,
        wordsMastered: 2,
        totalXp: 100,
        lastActive: '2026-09-02',
        gamesPlayed: 1,
      },
    ]);
  });

  it('resolves studentName to null (not a hardcoded string) for a placeholder-only profile, and normalizes timestamps to YYYY-MM-DD', async () => {
    const classroomsChain = eqChain([{ id: 'c1', name: 'Grade 5A' }]);
    const memberships = inRangeChain([[{ classroom_id: 'c1', student_id: 's1' }]]);
    const lessonAssignments = inRangeChain([[{ classroom_id: 'c1', lesson_id: 'l1' }]]);
    // display_name is a system placeholder — resolveDisplayName treats it as "no real name".
    const profiles = inRangeChain([[{ id: 's1', display_name: 'Player_abc12345', username: null }]]);
    const progress = inRangeChain([
      [{ student_id: 's1', lesson_id: 'l1', total_xp: 10, words_mastered: [], last_practice_date: '2026-09-01', completed_at: null }],
    ]);
    const sessions = inRangeChain([[{ student_id: 's1', lesson_id: 'l1', completed_at: '2026-09-11T14:23:45.123+00:00' }]]);

    (supabase.from as Mock).mockImplementation((table: string) => {
      switch (table) {
        case 'classrooms': return classroomsChain;
        case 'classroom_memberships': return memberships;
        case 'lesson_assignments': return lessonAssignments;
        case 'public_profiles': return profiles;
        case 'student_lesson_progress': return progress;
        case 'practice_sessions': return sessions;
        default: throw new Error(`unexpected table query: ${table}`);
      }
    });

    const result = await getTeacherExportRows(teacherId);

    expect(result.error).toBeNull();
    expect(result.data[0].studentName).toBeNull();
    // A full timestamptz session completion must not leak past the CSV's
    // date-only lastActive column.
    expect(result.data[0].lastActive).toBe('2026-09-11');
  });

  it('surfaces a query error instead of silently returning an empty export', async () => {
    const classroomsChain = eqChain([{ id: 'c1', name: 'Grade 5A' }]);
    const memberships = inRangeChain([], { message: 'RLS denied' });
    const lessonAssignments = inRangeChain([[]]);

    (supabase.from as Mock).mockImplementation((table: string) => {
      if (table === 'classrooms') return classroomsChain;
      if (table === 'classroom_memberships') return memberships;
      if (table === 'lesson_assignments') return lessonAssignments;
      throw new Error(`unexpected table query: ${table}`);
    });

    const result = await getTeacherExportRows(teacherId);

    expect(result.data).toEqual([]);
    expect(result.error).toEqual({ message: 'RLS denied' });
  });

  it('chunks .in() queries instead of growing 1:1 with the student count', async () => {
    // 101 students with CHUNK_SIZE=100 must produce 2 `.in()` calls on a
    // student-scoped table, not 101 (no N+1 per student) and not 1 (which
    // would blow past PostgREST's URL / row limits for a big roster).
    const studentIds = Array.from({ length: 101 }, (_, i) => `s${i}`);
    const memberships = studentIds.map((id) => ({ classroom_id: 'c1', student_id: id }));

    const classroomsChain = eqChain([{ id: 'c1', name: 'Grade 5A' }]);
    const membershipsChain = inRangeChain([memberships]);
    const lessonAssignmentsChain = inRangeChain([[]]);
    const profilesChain = inRangeChain([[], []]);
    const progressChain = inRangeChain([[], []]);
    const sessionsChain = inRangeChain([[], []]);

    (supabase.from as Mock).mockImplementation((table: string) => {
      switch (table) {
        case 'classrooms': return classroomsChain;
        case 'classroom_memberships': return membershipsChain;
        case 'lesson_assignments': return lessonAssignmentsChain;
        case 'public_profiles': return profilesChain;
        case 'student_lesson_progress': return progressChain;
        case 'practice_sessions': return sessionsChain;
        default: throw new Error(`unexpected table query: ${table}`);
      }
    });

    await getTeacherExportRows(teacherId);

    // student-scoped tables must be chunked into 2 `.in()` calls for 101 ids.
    expect(profilesChain.inFn).toHaveBeenCalledTimes(2);
    expect(progressChain.inFn).toHaveBeenCalledTimes(2);
    expect(sessionsChain.inFn).toHaveBeenCalledTimes(2);
  });

  it('paginates past the PostgREST 1000-row cap on a single table instead of truncating silently', async () => {
    const bigPage = Array.from({ length: 1000 }, (_, i) => ({
      classroom_id: 'c1',
      student_id: `s${i}`,
    }));
    const secondPage = [{ classroom_id: 'c1', student_id: 's1000' }];

    const classroomsChain = eqChain([{ id: 'c1', name: 'Grade 5A' }]);
    const membershipsChain = inRangeChain([bigPage, secondPage]);
    const lessonAssignmentsChain = inRangeChain([[]]);
    const profilesChain = inRangeChain([[], [], [], [], [], [], [], [], [], [], []]);
    const progressChain = inRangeChain([[], [], [], [], [], [], [], [], [], [], []]);
    const sessionsChain = inRangeChain([[], [], [], [], [], [], [], [], [], [], []]);

    (supabase.from as Mock).mockImplementation((table: string) => {
      switch (table) {
        case 'classrooms': return classroomsChain;
        case 'classroom_memberships': return membershipsChain;
        case 'lesson_assignments': return lessonAssignmentsChain;
        case 'public_profiles': return profilesChain;
        case 'student_lesson_progress': return progressChain;
        case 'practice_sessions': return sessionsChain;
        default: throw new Error(`unexpected table query: ${table}`);
      }
    });

    const result = await getTeacherExportRows(teacherId);

    // 1000 + 1 rows fetched across 2 pages of the SAME .in() chunk, proving
    // the export doesn't quietly drop student #1001 at the PostgREST cap.
    expect(membershipsChain.range).toHaveBeenCalledTimes(2);
    expect(result.error).toBeNull();
  });
});
