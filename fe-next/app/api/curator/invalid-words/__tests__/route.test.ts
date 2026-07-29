import { describe, it, expect, vi, beforeEach } from 'vitest';

const auth = { v: true, lastLanguage: undefined as string | undefined };
vi.mock('@/lib/auth/curatorAuth', () => ({
  verifyCuratorAuth: async (_r: unknown, opts: { language?: string } = {}) => {
    auth.lastLanguage = opts.language;
    return auth.v
      ? { success: true, user: { id: 'cur-1' }, languages: ['he'] }
      : { success: false, response: new Response('no', { status: 403 }) };
  },
}));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

const data = { rows: [{ id: '1', word: 'זוז', language: 'he', submission_count: 4, reason: 'not_in_dictionary' }] };
vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    from: () => {
      const qb: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'is', 'order', 'limit']) qb[m] = () => qb;
      (qb as { then: unknown }).then = (resolve: (v: unknown) => void) =>
        resolve({ data: data.rows, error: null });
      return qb;
    },
  }),
}));

import { GET } from '../route';
const req = (q = '?lang=he') =>
  new Request(`http://localhost/api/curator/invalid-words${q}`) as never;

beforeEach(() => {
  auth.v = true;
  auth.lastLanguage = undefined;
});

describe('GET /api/curator/invalid-words', () => {
  it('400 when lang is missing', async () => {
    const res = await GET(req(''));
    expect(res.status).toBe(400);
  });

  it('scopes the curator auth check to the requested language', async () => {
    await GET(req('?lang=he'));
    expect(auth.lastLanguage).toBe('he');
  });

  it('returns the auth failure for a non-curator of that language', async () => {
    auth.v = false;
    const res = await GET(req('?lang=en'));
    expect(res.status).toBe(403);
  });

  it('returns the rejected words for the language', async () => {
    const res = await GET(req('?lang=he'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.words).toHaveLength(1);
    expect(json.words[0].word).toBe('זוז');
  });
});
