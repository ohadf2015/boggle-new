import { vi, describe, it, expect, beforeEach } from 'vitest';

const inserts: Record<string, unknown>[] = [];
const rpcs: unknown[][] = [];
let insertErrors: ({ code: string; message: string } | null)[] = [];
let existingCopy: Record<string, unknown> | null = null;
const notify = vi.fn();

function builder() {
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.eq = () => b;
  b.order = () => b;
  b.limit = async () => ({ data: existingCopy ? [existingCopy] : [], error: null });
  b.insert = (row: Record<string, unknown>) => {
    inserts.push(row);
    const err = insertErrors.shift() ?? null;
    const chain = { select: () => chain, single: async () => (err ? { data: null, error: err } : { data: { id: 'new', ...row }, error: null }) };
    return chain;
  };
  return b;
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => builder(),
    // Lazy like postgrest: only an awaited builder sends the request.
    rpc: (...args: unknown[]) => ({
      then: (ok: (v: unknown) => unknown, fail?: (e: unknown) => unknown) => {
        rpcs.push(args);
        return Promise.resolve({ data: null, error: null }).then(ok, fail);
      },
    }),
  },
}));
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: vi.fn() }));
vi.mock('@/hooks/useVocabularyLesson', () => ({ notifyLessonsChanged: () => notify() }));
vi.mock('@/utils/logger', () => ({ default: { warn: vi.fn(), debug: vi.fn(), error: vi.fn() } }));

import { copyToMine, VERIFIED_AUTHOR } from '../libraryClient';
import type { LibraryItem } from '../libraryTypes';

const item = (over: Partial<LibraryItem> = {}): LibraryItem => ({
  id: 'pub-1',
  source: 'teacher',
  name: 'Fruits',
  description: null,
  language: 'en',
  words: [{ word: 'apple', canIntegrate: true }],
  wordCount: 1,
  authorName: 'Ms Fisher',
  gradeBand: 'g35',
  topic: 'science',
  copyCount: 0,
  playCount: 0,
  createdAt: null,
  isMine: false,
  remixedFrom: null,
  ...over,
});

describe('copyToMine', () => {
  beforeEach(() => {
    inserts.length = 0;
    rpcs.length = 0;
    insertErrors = [];
    existingCopy = null;
    notify.mockClear();
  });

  it('copies a teacher list with remix credit, bumps its copy count and refreshes every lesson list', async () => {
    const { lesson, reused } = await copyToMine(item(), 'me');
    await new Promise((r) => setTimeout(r, 0));
    expect(reused).toBe(false);
    expect(lesson?.id).toBe('new');
    expect(inserts[0]).toMatchObject({
      teacher_id: 'me',
      is_public: false,
      source_lesson_id: 'pub-1',
      remixed_from_title: 'Fruits',
      remixed_from_author: 'Ms Fisher',
    });
    expect(rpcs[0]).toEqual(['bump_vocabulary_lesson_stat', { p_lesson_id: 'pub-1', p_kind: 'copy' }]);
    expect(notify).toHaveBeenCalled();
  });

  it('credits LexiClash for a verified list and never bumps a counter', async () => {
    await copyToMine(item({ id: 'curriculum:c1', source: 'verified', authorName: null }), 'me');
    expect(inserts[0]).toMatchObject({ source_lesson_id: null, remixed_from_author: VERIFIED_AUTHOR });
    expect(rpcs).toEqual([]);
  });

  it('falls back to a plain copy when the library columns are missing', async () => {
    insertErrors = [{ code: 'PGRST204', message: "Could not find the 'remixed_from_title' column" }];
    const { lesson } = await copyToMine(item(), 'me');
    expect(lesson?.id).toBe('new');
    expect(inserts[1]).not.toHaveProperty('remixed_from_title');
  });

  it('reuses an earlier copy when asked, without inserting', async () => {
    existingCopy = { id: 'old-copy' };
    const { lesson, reused } = await copyToMine(item(), 'me', { reuse: true });
    expect(reused).toBe(true);
    expect(lesson?.id).toBe('old-copy');
    expect(inserts).toEqual([]);
  });
});
