/**
 * Route-level language allowlist: Russian drills got 400 here, so every ru
 * board was pure random letters with no placed words.
 */
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/backend/dictionary', () => ({
  ensureLanguageLoaded: vi.fn().mockResolvedValue(undefined),
  getRandomLongWords: vi.fn().mockReturnValue(['КОТ', 'ДОМ']),
}));

import { GET } from '../random-words/route';

describe('GET /api/drills/random-words', () => {
  it.each(['en', 'he', 'sv', 'es', 'ja', 'ru'])('accepts %s', async (language) => {
    const res = await GET(new NextRequest(`http://x/api/drills/random-words?language=${language}`));
    expect(res.status).toBe(200);
  });

  it('rejects an unknown language', async () => {
    const res = await GET(new NextRequest('http://x/api/drills/random-words?language=xx'));
    expect(res.status).toBe(400);
  });
});
