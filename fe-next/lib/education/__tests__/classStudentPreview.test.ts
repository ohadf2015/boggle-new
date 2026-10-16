import { describe, it, expect, vi } from 'vitest';
import {
  fetchClassStudentPreview,
  CLASS_PREVIEW_LIMIT,
  CLASS_PREVIEW_MAX_CLASSES,
  CLASS_PREVIEW_MAX_ROWS,
} from '../classStudentPreview';

type Row = { classroom_id: string; student_id: string };

function clientFor(rows: Row[] | null, error: unknown = null, delayMs = 0) {
  const calls: Array<{ ids: string[]; limit: number }> = [];
  let ids: string[] = [];
  const q: Record<string, unknown> = {
    select: () => q,
    in: (_col: string, v: string[]) => ((ids = v), q),
    order: () => q,
    limit: (n: number) => {
      calls.push({ ids, limit: n });
      const result = { data: rows, error };
      return delayMs ? new Promise((r) => setTimeout(() => r(result), delayMs)) : Promise.resolve(result);
    },
  };
  return { client: { from: vi.fn(() => q) }, calls };
}

const rows = (cls: string, n: number): Row[] => Array.from({ length: n }, (_, i) => ({ classroom_id: cls, student_id: `${cls}${i}` }));

describe('fetchClassStudentPreview', () => {
  it('Given several classes, Then one bounded query returns up to 4 students per class', async () => {
    const { client, calls } = clientFor([...rows('a', 6), ...rows('b', 1)]);
    const out = await fetchClassStudentPreview(client as never, ['a', 'b', 'c']);
    expect(out).toEqual({ a: ['a0', 'a1', 'a2', 'a3'], b: ['b0'], c: [] });
    expect(calls).toEqual([{ ids: ['a', 'b', 'c'], limit: CLASS_PREVIEW_MAX_ROWS }]);
    expect(out.a).toHaveLength(CLASS_PREVIEW_LIMIT);
  });

  it('Given more classes than the cap, Then it asks only for the first ones', async () => {
    const ids = Array.from({ length: CLASS_PREVIEW_MAX_CLASSES + 5 }, (_, i) => `c${i}`);
    const { client, calls } = clientFor([]);
    await fetchClassStudentPreview(client as never, ids);
    expect(calls[0].ids).toHaveLength(CLASS_PREVIEW_MAX_CLASSES);
  });

  it('Given the read errors, Then it throws so the list keeps its fallback badge', async () => {
    const { client } = clientFor(null, { message: 'x' });
    await expect(fetchClassStudentPreview(client as never, ['a'])).rejects.toThrow();
  });

  it('Given the read hangs past the cap, Then it gives up instead of holding the list', async () => {
    vi.useFakeTimers();
    const { client } = clientFor([], null, 60_000);
    const pending = fetchClassStudentPreview(client as never, ['a']);
    const assertion = expect(pending).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(3_001);
    await assertion;
    vi.useRealTimers();
  });
});
