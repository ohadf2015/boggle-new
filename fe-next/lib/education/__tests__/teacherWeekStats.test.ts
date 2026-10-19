import { describe, it, expect, vi } from 'vitest';
import { summarizeTeacherWeek, fetchTeacherActivityRows, TEACHER_ACTIVITY_WINDOW_DAYS } from '../teacherWeekStats';

const NOW = Date.parse('2026-10-15T12:00:00Z');
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

describe('summarizeTeacherWeek', () => {
  const classrooms = [
    { id: 'a', member_count: 28 },
    { id: 'b', member_count: 26 },
    { id: 'c' },
  ];

  it('Given one row per student per game, When summarised, Then games count distinct room codes this week', () => {
    const rows = [
      { classroom_id: 'a', completed_at: daysAgo(1), game_code: 'K7Q2' },
      { classroom_id: 'a', completed_at: daysAgo(1), game_code: 'K7Q2' },
      { classroom_id: 'b', completed_at: daysAgo(3), game_code: 'ZZ11' },
      { classroom_id: 'a', completed_at: daysAgo(10), game_code: 'OLD1' },
    ];
    const s = summarizeTeacherWeek(rows, classrooms, NOW);
    expect(s.gamesPlayed).toBe(2);
    expect(s.activeClasses).toBe(2);
    expect(s.totalStudents).toBe(54);
  });

  it('Given games older than a week, Then gamesLast30d still counts every distinct game in the window', () => {
    const rows = [
      { classroom_id: 'a', completed_at: daysAgo(1), game_code: 'K7Q2' },
      { classroom_id: 'a', completed_at: daysAgo(1), game_code: 'K7Q2' },
      { classroom_id: 'a', completed_at: daysAgo(20), game_code: 'OLD1' },
      { classroom_id: 'b', completed_at: daysAgo(25), game_code: 'OLD1' },
    ];
    const s = summarizeTeacherWeek(rows, classrooms, NOW);
    expect(s.gamesPlayed).toBe(1);
    expect(s.gamesLast30d).toBe(3);
  });

  it('Given a rematch that reuses a room code in two classes, Then each class-and-code pair is its own game', () => {
    const rows = [
      { classroom_id: 'a', completed_at: daysAgo(1), game_code: 'SAME' },
      { classroom_id: 'b', completed_at: daysAgo(2), game_code: 'SAME' },
    ];
    expect(summarizeTeacherWeek(rows, classrooms, NOW).gamesPlayed).toBe(2);
  });

  it('Given older rows, Then every class still gets its most recent play time', () => {
    const rows = [
      { classroom_id: 'a', completed_at: daysAgo(10), game_code: 'OLD1' },
      { classroom_id: 'a', completed_at: daysAgo(2), game_code: 'NEW1' },
    ];
    const s = summarizeTeacherWeek(rows, classrooms, NOW);
    expect(s.lastPlayedAt).toEqual({ a: daysAgo(2) });
    expect(s.activeClasses).toBe(1);
  });

  it('Given no games at all, Then the week is zeros, not missing', () => {
    expect(summarizeTeacherWeek([], classrooms, NOW)).toEqual({
      gamesPlayed: 0,
      gamesLast30d: 0,
      totalStudents: 54,
      activeClasses: 0,
      lastPlayedAt: {},
    });
  });
});

describe('fetchTeacherActivityRows', () => {
  function chain(result: unknown) {
    const calls: Record<string, unknown[]> = {};
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'in', 'gte', 'not', 'order', 'limit', 'abortSignal']) {
      q[m] = (...args: unknown[]) => {
        calls[m] = args;
        return m === 'abortSignal' ? Promise.resolve(result) : q;
      };
    }
    return { db: { from: vi.fn(() => q) }, calls };
  }

  it('Given class ids, Then it reads the indexed classroom/completed_at window with a row cap', async () => {
    const { db, calls } = chain({ data: [{ classroom_id: 'a', completed_at: daysAgo(1), game_code: 'X' }], error: null });
    const rows = await fetchTeacherActivityRows(db as never, ['a', 'b'], NOW);
    expect(rows).toHaveLength(1);
    expect(db.from).toHaveBeenCalledWith('practice_sessions');
    expect(calls.in).toEqual(['classroom_id', ['a', 'b']]);
    expect(calls.gte).toEqual(['completed_at', daysAgo(TEACHER_ACTIVITY_WINDOW_DAYS)]);
    expect(calls.not).toEqual(['results->>gameCode', 'is', null]);
    expect(calls.order).toEqual(['completed_at', { ascending: false }]);
    expect(typeof calls.limit[0]).toBe('number');
  });

  it('Given no classes, Then it never queries', async () => {
    const { db } = chain({ data: [], error: null });
    expect(await fetchTeacherActivityRows(db as never, [], NOW)).toEqual([]);
    expect(db.from).not.toHaveBeenCalled();
  });

  it('Given a query error, Then it throws so the card can show "—" instead of a false zero', async () => {
    const { db } = chain({ data: null, error: { message: 'boom' } });
    await expect(fetchTeacherActivityRows(db as never, ['a'], NOW)).rejects.toThrow('boom');
  });
});
