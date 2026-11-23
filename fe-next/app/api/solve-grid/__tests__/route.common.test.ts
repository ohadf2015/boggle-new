import { describe, it, expect, vi, beforeEach } from 'vitest';

const loadCommonWords = vi.fn();
vi.mock('@/lib/adventure/play/commonWords', () => ({ loadCommonWords: (l: string) => loadCommonWords(l) }));
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => ({ success: true }), rateLimitResponse: vi.fn() }));
vi.mock('@/backend/modules/boggleSolver', () => ({
  findWordsForBots: () => ({ easy: ['fei', 'cat'], medium: ['house'], hard: ['ecu'] }),
}));

import { POST } from '../route';

const grid = [['c', 'a', 't', 'e'], ['h', 'o', 'u', 's'], ['e', 'f', 'e', 'i'], ['e', 'c', 'u', 'x']];
const call = (language: string) =>
  POST(new Request('http://x/api/solve-grid', { method: 'POST', body: JSON.stringify({ grid, language }) }) as never);

describe('POST /api/solve-grid common words', () => {
  beforeEach(() => { loadCommonWords.mockReset(); loadCommonWords.mockResolvedValue(['cat', 'house', 'dog']); });

  it('Given a known language, Then the board words that are everyday words come back as common', async () => {
    const body = await (await call('en')).json();
    expect(body.words.common).toEqual(['cat', 'house']);
  });

  it('Given an unknown language, Then no word list file is read', async () => {
    const body = await (await call('../../etc')).json();
    expect(loadCommonWords).not.toHaveBeenCalled();
    expect(body.words.common).toEqual([]);
  });
});
