/**
 * getClassMastery — reads classroom `practice_sessions` rows and folds them
 * through `lib/education/wordMasteryTrend.buildClassMastery` for the Teacher
 * Pro "Word Mastery" card. Mirrors the `getRecentClassroomGames` test style
 * (chainable query stub); teacher ownership is enforced by RLS, not here.
 */
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { getClassMastery } from '../wordMastery';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));
vi.mock('@/utils/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

type Result = { data?: unknown; error?: { message: string } | null };

/** Chainable query stub: every builder method returns itself; awaiting resolves `result`. */
function chain(result: Result) {
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'not', 'order', 'limit']) {
    q[m] = vi.fn(() => q);
  }
  q.then = (resolve: (v: Result) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null, ...result }).then(resolve, reject);
  return q as Record<string, Mock> & PromiseLike<Result>;
}

function mockTable(result: Result) {
  const q = chain(result);
  (supabase!.from as Mock).mockImplementation((table: string) => {
    if (table !== 'practice_sessions') throw new Error(`unexpected table ${table}`);
    return q;
  });
  return q;
}

describe('getClassMastery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters to this classroom, asked-word rows only, oldest first', async () => {
    const q = mockTable({ data: [] });

    await getClassMastery('class-1');

    expect(q.eq).toHaveBeenCalledWith('classroom_id', 'class-1');
    expect(q.not).toHaveBeenCalledWith('results->>lessonWordsAsked', 'is', null);
    expect(q.order).toHaveBeenCalledWith('started_at', { ascending: true });
  });

  it('returns empty class mastery when the class has no evidence rows', async () => {
    mockTable({ data: [] });

    const { data, error } = await getClassMastery('class-1');

    expect(error).toBeNull();
    expect(data).toEqual({
      students: [],
      classStuckWords: [],
      sessionsAnalyzed: 0,
      rowsSkipped: 0,
    });
  });

  it('folds practice_sessions rows into per-student word trajectories', async () => {
    mockTable({
      data: [
        {
          student_id: 'stu-1',
          started_at: '2026-09-01T10:00:00Z',
          results: { gameCode: 'g1', lessonWordsAsked: ['cat', 'dog'], lessonWordsFound: ['cat'] },
        },
        {
          student_id: 'stu-1',
          started_at: '2026-09-02T10:00:00Z',
          results: { gameCode: 'g2', lessonWordsAsked: ['cat', 'dog'], lessonWordsFound: [] },
        },
      ],
    });

    const { data, error } = await getClassMastery('class-1');

    expect(error).toBeNull();
    expect(data?.sessionsAnalyzed).toBe(2);
    const student = data?.students.find((s) => s.studentId === 'stu-1');
    const dog = student?.words.find((w) => w.word === 'dog');
    expect(dog?.trend).toBe('stuck');
    const cat = student?.words.find((w) => w.word === 'cat');
    expect(cat?.trend).toBe('stuck'); // found once, missed once, last try wrong
  });

  it('surfaces the query error without throwing', async () => {
    mockTable({ error: { message: 'boom' } });

    const { data, error } = await getClassMastery('class-1');

    expect(data).toBeNull();
    expect(error).toEqual({ message: 'boom' });
  });
});
