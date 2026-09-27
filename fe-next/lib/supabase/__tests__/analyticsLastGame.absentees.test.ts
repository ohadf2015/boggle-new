/**
 * getRecentClassroomGames — roster students who did NOT play.
 *
 * The word x student grid needs an honest third cell state. "Missed" and
 * "was not in the room" are different instructional facts, and only the
 * roster can tell them apart. Absentees are additive: they never enter the
 * miss rates, the average accuracy, or `participation.played`, all of which
 * describe the students who actually played.
 */
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { getRecentClassroomGames } from '../analyticsLastGame';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));
vi.mock('@/utils/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

type Result = { data?: unknown; error?: { message: string } | null; count?: number | null };

function chain(result: Result) {
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'not', 'order', 'limit', 'gte', 'lte']) {
    q[m] = vi.fn(() => q);
  }
  q.then = (resolve: (v: Result) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null, count: null, ...result }).then(resolve, reject);
  return q as Record<string, Mock> & PromiseLike<Result>;
}

function mockTables(tables: Record<string, Result>) {
  const chains: Record<string, ReturnType<typeof chain>> = {};
  (supabase!.from as Mock).mockImplementation((table: string) => {
    if (!(table in tables)) throw new Error(`unexpected table ${table}`);
    chains[table] = chains[table] ?? chain(tables[table]);
    return chains[table];
  });
  return chains;
}

function sessionRow(
  studentId: string,
  found: string[],
  missed: string[],
  gameCode = 'G1',
  completedAt = '2026-09-04T10:00:00Z'
) {
  return {
    student_id: studentId,
    score: 100,
    total_score: 100,
    mode: 'classic',
    completed_at: completedAt,
    results: {
      gameCode,
      gameMode: 'classic',
      lessonIds: ['lesson-1'],
      lessonWordsFound: found,
      lessonWordsMissed: missed,
      allWordsFound: found,
      playerCount: 2,
    },
  };
}

describe('getRecentClassroomGames — absent roster students', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists roster students with no session row as absent, with their real names', async () => {
    mockTables({
      practice_sessions: { data: [sessionRow('stu-1', ['cat'], ['dog'])] },
      classroom_memberships: {
        data: [{ student_id: 'stu-1' }, { student_id: 'stu-2' }, { student_id: 'stu-3' }],
        count: 3,
      },
      public_profiles: {
        data: [
          { id: 'stu-1', display_name: 'Alice' },
          { id: 'stu-2', display_name: 'Bob' },
          { id: 'stu-3', display_name: 'Cleo' },
        ],
      },
    });

    const { data } = await getRecentClassroomGames('class-1', 5);

    expect(data[0].absentStudents).toEqual([
      { studentId: 'stu-2', name: 'Bob' },
      { studentId: 'stu-3', name: 'Cleo' },
    ]);
  });

  it('keeps absentees out of the miss rates, the average accuracy and the player list', async () => {
    mockTables({
      practice_sessions: { data: [sessionRow('stu-1', ['cat'], ['dog'])] },
      classroom_memberships: {
        data: [{ student_id: 'stu-1' }, { student_id: 'stu-2' }],
        count: 2,
      },
      public_profiles: { data: [{ id: 'stu-1', display_name: 'Alice' }] },
    });

    const { data } = await getRecentClassroomGames('class-1', 5);

    expect(data[0].players).toHaveLength(1);
    expect(data[0].participation).toEqual({ played: 1, roster: 2 });
    // dog was missed by the 1 student who played, not 1 of 2 on the roster.
    expect(data[0].missedWords.find((w) => w.word === 'dog')).toEqual({
      word: 'dog',
      missedBy: 1,
      total: 1,
      pct: 100,
    });
    expect(data[0].averageAccuracyPct).toBe(50);
  });

  it('degrades to an empty absentee list when the roster query fails', async () => {
    mockTables({
      practice_sessions: { data: [sessionRow('stu-1', ['cat'], [])] },
      classroom_memberships: { error: { message: 'rls' } },
      public_profiles: { data: [{ id: 'stu-1', display_name: 'Alice' }] },
    });

    const { data, error } = await getRecentClassroomGames('class-1', 5);

    expect(error).toBeNull();
    expect(data[0].absentStudents).toEqual([]);
    expect(data[0].players).toHaveLength(1);
  });

  it('never marks a student absent from a game played before they enrolled', async () => {
    // stu-2 joined on the 3rd: absent from the 4th's game, not from the 1st's.
    mockTables({
      practice_sessions: {
        data: [
          sessionRow('stu-1', ['cat'], ['dog'], 'NEW', '2026-09-04T10:00:00Z'),
          sessionRow('stu-1', ['cat'], ['dog'], 'OLD', '2026-09-01T10:00:00Z'),
        ],
      },
      classroom_memberships: {
        data: [
          { student_id: 'stu-1', joined_at: '2026-08-01T00:00:00Z' },
          { student_id: 'stu-2', joined_at: '2026-09-03T00:00:00Z' },
        ],
        count: 2,
      },
      public_profiles: {
        data: [
          { id: 'stu-1', display_name: 'Alice' },
          { id: 'stu-2', display_name: 'Bob' },
        ],
      },
    });

    const { data } = await getRecentClassroomGames('class-1', 5);

    const newer = data.find((g) => g.gameCode === 'NEW')!;
    const older = data.find((g) => g.gameCode === 'OLD')!;
    expect(newer.absentStudents).toEqual([{ studentId: 'stu-2', name: 'Bob' }]);
    expect(older.absentStudents).toEqual([]);
  });

  it('treats a missing enrollment date as a long-standing member', async () => {
    mockTables({
      practice_sessions: { data: [sessionRow('stu-1', ['cat'], [])] },
      classroom_memberships: {
        data: [{ student_id: 'stu-1' }, { student_id: 'stu-2', joined_at: null }],
        count: 2,
      },
      public_profiles: {
        data: [
          { id: 'stu-1', display_name: 'Alice' },
          { id: 'stu-2', display_name: 'Bob' },
        ],
      },
    });

    const { data } = await getRecentClassroomGames('class-1', 5);

    expect(data[0].absentStudents).toEqual([{ studentId: 'stu-2', name: 'Bob' }]);
  });

  it('numbers an unnamed absentee with the same fallback label as a player', async () => {
    mockTables({
      practice_sessions: { data: [sessionRow('stu-1', ['cat'], [])] },
      classroom_memberships: {
        data: [{ student_id: 'stu-1' }, { student_id: 'stu-2' }],
        count: 2,
      },
      public_profiles: {
        data: [
          { id: 'stu-1', display_name: 'Alice' },
          { id: 'stu-2', display_name: 'Player_deadbeef', username: 'Player_deadbeef' },
        ],
      },
    });

    const { data } = await getRecentClassroomGames('class-1', 5, { fallbackName: 'Student' });

    expect(data[0].absentStudents[0].name).toBe('Student 1');
    expect(data[0].absentStudents[0].name).not.toMatch(/player_/i);
  });
});
