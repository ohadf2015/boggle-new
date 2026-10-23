import { describe, it, expect, vi } from 'vitest';
import { readClassAnalytics } from '../classAnalyticsServer';

const today = new Date().toISOString().split('T')[0];

function client(tables: Record<string, { data: unknown; error: unknown }>) {
  return {
    from: vi.fn((table: string) => {
      const result = tables[table];
      const q: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'in', 'gte']) q[m] = vi.fn(() => q);
      q.then = (resolve: (v: unknown) => unknown) => resolve(result);
      return q;
    }),
  };
}

describe('readClassAnalytics', () => {
  it('returns zeroed metrics for a class with no students', async () => {
    const sb = client({ classroom_memberships: { data: [], error: null } });
    const { data } = await readClassAnalytics(sb as never, 'c1');
    expect(data).toEqual({
      studentsNeedingHelp: 0, classAverageXp: 0, activeStudentsToday: 0, weeklyEngagement: 0, totalStudents: 0, commonMistakes: [],
    });
  });

  it('counts struggling and active students and ranks the most-missed words', async () => {
    const sb = client({
      classroom_memberships: { data: [{ student_id: 'a' }, { student_id: 'b' }], error: null },
      student_lesson_progress: {
        data: [
          { student_id: 'a', total_xp: 30, last_practice_date: today, words_attempted: { desk: { attempts: 4, correct: 0 }, pen: { attempts: 2, correct: 2 } } },
          { student_id: 'b', total_xp: 50, last_practice_date: '2000-01-01', words_attempted: { desk: { attempts: 2, correct: 1 } } },
        ],
        error: null,
      },
    });
    const { data, error } = await readClassAnalytics(sb as never, 'c1');
    expect(error).toBeNull();
    expect(data?.totalStudents).toBe(2);
    expect(data?.studentsNeedingHelp).toBe(1);
    expect(data?.activeStudentsToday).toBe(1);
    expect(data?.commonMistakes).toEqual([{ word: 'desk', errorRate: 5 / 6, studentCount: 2 }]);
  });

  it('surfaces a read error instead of empty metrics', async () => {
    const sb = client({ classroom_memberships: { data: null, error: { message: 'rls' } } });
    const { data, error } = await readClassAnalytics(sb as never, 'c1');
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'rls' });
  });
});
