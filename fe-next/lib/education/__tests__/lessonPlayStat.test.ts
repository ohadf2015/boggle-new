import { vi, describe, it, expect, beforeEach } from 'vitest';

const executedRpcs: unknown[][] = [];
const inFilters: unknown[][] = [];
let lessonRows: { id: string; source_lesson_id: string | null }[] = [];
let rpcError: { message: string } | null = null;

// Lazy like postgrest: the request only goes out when the builder is awaited.
function lazy<T>(onExecute: () => T) {
  return { then: (ok: (v: T) => unknown, fail?: (e: unknown) => unknown) => Promise.resolve().then(onExecute).then(ok, fail) };
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        in: (...args: unknown[]) => {
          inFilters.push(args);
          return lazy(() => ({ data: lessonRows, error: null }));
        },
      }),
    }),
    rpc: (...args: unknown[]) =>
      lazy(() => {
        executedRpcs.push(args);
        return { data: null, error: rpcError };
      }),
  },
}));
const log = vi.hoisted(() => ({ warn: vi.fn(), debug: vi.fn(), error: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: log }));

import { bumpLessonStat, recordLessonPlays } from '../lessonPlayStat';

describe('lessonPlayStat', () => {
  beforeEach(() => {
    executedRpcs.length = 0;
    inFilters.length = 0;
    lessonRows = [];
    rpcError = null;
    log.warn.mockClear();
  });

  it('given a copy of a Discover list, when it is played, then the play is credited to the original list', async () => {
    lessonRows = [
      { id: 'copy-1', source_lesson_id: 'pub-1' },
      { id: 'own-1', source_lesson_id: null },
    ];

    await recordLessonPlays(['copy-1', 'own-1', 'copy-1']);

    expect(inFilters[0]).toEqual(['id', ['copy-1', 'own-1']]);
    expect(executedRpcs).toEqual([
      ['bump_vocabulary_lesson_stat', { p_lesson_id: 'pub-1', p_kind: 'play' }],
      ['bump_vocabulary_lesson_stat', { p_lesson_id: 'own-1', p_kind: 'play' }],
    ]);
  });

  it('given no lessons, when recording plays, then nothing is queried', async () => {
    await recordLessonPlays([]);
    expect(inFilters).toHaveLength(0);
    expect(executedRpcs).toHaveLength(0);
  });

  it('given a copy bump, when called fire-and-forget, then the RPC request is actually executed', async () => {
    void bumpLessonStat('pub-9', 'copy');
    await new Promise((r) => setTimeout(r, 0));
    expect(executedRpcs).toEqual([['bump_vocabulary_lesson_stat', { p_lesson_id: 'pub-9', p_kind: 'copy' }]]);
  });

  it('given the RPC fails, when bumping, then it logs and never throws', async () => {
    rpcError = { message: 'nope' };
    await expect(bumpLessonStat('pub-9', 'play')).resolves.toBeUndefined();
    expect(log.warn).toHaveBeenCalled();
  });
});
