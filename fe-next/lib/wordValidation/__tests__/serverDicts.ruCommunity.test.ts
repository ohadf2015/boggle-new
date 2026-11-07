import { describe, it, expect, beforeEach, vi } from 'vitest';

const communityRows = new Set<string>();
vi.mock('@/utils/supabase/anon', () => ({
  getAnonClient: () => ({
    from: () => {
      const q: Record<string, string> = {};
      const chain = {
        select: () => chain,
        eq: (col: string, val: string) => { q[col] = val; return chain; },
        limit: () => chain,
        maybeSingle: async () => ({
          data: communityRows.has(`${q.language}:${q.word}`) ? { id: 1 } : null,
          error: null,
        }),
      };
      return chain;
    },
  }),
}));

import { validateWordOnServer, __resetServerDictsForTest } from '../serverDicts';

describe('validateWordOnServer — offline replay matches the live game', () => {
  beforeEach(() => {
    __resetServerDictsForTest();
    communityRows.clear();
  });

  it('accepts Russian dictionary words, with and without ё', async () => {
    expect(await validateWordOnServer('дом', 'ru')).toBe(true);
    expect(await validateWordOnServer('ёлка', 'ru')).toBe(true);
    expect(await validateWordOnServer('елка', 'ru')).toBe(true);
    expect(await validateWordOnServer('щщщщ', 'ru')).toBe(false);
  });

  it('accepts community-approved words that the base list lacks', async () => {
    communityRows.add('en:zzyzxq');
    expect(await validateWordOnServer('zzyzxq', 'en')).toBe(true);
    expect(await validateWordOnServer('zzyzxr', 'en')).toBe(false);
  });

  it('looks community words up by their normalized form', async () => {
    communityRows.add('he:שלומקקק');
    expect(await validateWordOnServer('שלומקקק', 'he')).toBe(true);
    expect(await validateWordOnServer('שלומקקק'.replace(/מ/, 'ם'), 'he')).toBe(true);
  });
});
