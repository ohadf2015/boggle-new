import { describe, expect, it, vi } from 'vitest';
import { readFreeInsightClassId, readWeekHardestWords } from '../freeClassInsightServer';
import { FREE_PREVIEW_WORDS } from '@/lib/education/wordMasteryReport';

function chain(result: { data: unknown; error: unknown }) {
  const calls: { method: string; args: unknown[] }[] = [];
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'not', 'gte', 'order', 'limit']) {
    q[m] = vi.fn((...args: unknown[]) => {
      calls.push({ method: m, args });
      return q;
    });
  }
  q.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return { sb: { from: vi.fn(() => q) }, calls };
}

const asked = (studentId: string, startedAt: string, code: string, words: string[], found: string[]) => ({
  student_id: studentId,
  started_at: startedAt,
  results: { gameCode: code, gameMode: 'vocab-quiz', lessonWordsAsked: words, lessonWordsFound: found, lessonWordsMissed: words.filter((w) => !found.includes(w)) },
});

describe('readFreeInsightClassId', () => {
  it('given a teacher with classes, when read, then the oldest class id comes back from their own rows', async () => {
    const { sb, calls } = chain({ data: [{ id: 'new', created_at: '2026-11-01T00:00:00Z' }, { id: 'old', created_at: '2026-09-01T00:00:00Z' }], error: null });
    await expect(readFreeInsightClassId(sb as never, 't1')).resolves.toEqual({ data: 'old', error: null });
    expect(calls).toContainEqual({ method: 'eq', args: ['teacher_id', 't1'] });
  });

  it('given the lookup fails, when read, then the error is returned and no class is chosen', async () => {
    const { sb } = chain({ data: null, error: { message: 'boom' } });
    await expect(readFreeInsightClassId(sb as never, 't1')).resolves.toEqual({ data: null, error: { message: 'boom' } });
  });
});

describe('readWeekHardestWords', () => {
  it('given this week of games, when read, then only the free number of hardest words comes back, scoped to the week', async () => {
    const rows = [
      asked('s1', '2026-11-09T10:00:00Z', 'A1', ['apple', 'pear', 'plum', 'kiwi', 'fig'], []),
      asked('s2', '2026-11-09T10:00:00Z', 'A1', ['apple', 'pear', 'plum', 'kiwi', 'fig'], ['fig']),
    ];
    const { sb, calls } = chain({ data: rows, error: null });
    const out = await readWeekHardestWords(sb as never, 'c1', '2026-11-03T00:00:00.000Z');
    expect(out.error).toBeNull();
    expect(out.data?.hardestWords).toHaveLength(FREE_PREVIEW_WORDS);
    expect(out.data?.sessions).toBe(2);
    expect(calls).toContainEqual({ method: 'gte', args: ['started_at', '2026-11-03T00:00:00.000Z'] });
    expect(calls).toContainEqual({ method: 'eq', args: ['classroom_id', 'c1'] });
  });

  it('given rows written before lesson words were stored, when read, then they count for nothing and nothing throws', async () => {
    const { sb } = chain({ data: [{ student_id: 's1', started_at: '2026-11-09T10:00:00Z', results: { score: 4 } }, { student_id: 's2', started_at: '2026-11-09T10:00:00Z', results: null }], error: null });
    const out = await readWeekHardestWords(sb as never, 'c1', '2026-11-03T00:00:00.000Z');
    expect(out.data?.hardestWords).toEqual([]);
  });

  it('given the read fails, when read, then the error is returned', async () => {
    const { sb } = chain({ data: null, error: { message: 'down' } });
    await expect(readWeekHardestWords(sb as never, 'c1', '2026-11-03T00:00:00.000Z')).resolves.toEqual({ data: null, error: { message: 'down' } });
  });
});
