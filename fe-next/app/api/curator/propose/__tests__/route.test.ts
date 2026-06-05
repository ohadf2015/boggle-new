import { describe, it, expect, vi, beforeEach } from 'vitest';

const sameOrigin = { v: true };
const auth = {
  v: true,
  lastLanguage: undefined as string | undefined,
  result: { success: true, user: { id: 'cur-1' }, languages: ['he'] } as Record<string, unknown>,
};
vi.mock('@/lib/auth/sameOrigin', () => ({ isSameOrigin: () => sameOrigin.v }));
vi.mock('@/lib/auth/curatorAuth', () => ({
  verifyCuratorAuth: async (_req: unknown, opts: { language?: string } = {}) => {
    auth.lastLanguage = opts.language;
    return auth.v
      ? auth.result
      : { success: false, response: new Response('no', { status: 403 }) };
  },
}));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

const captured: { rows: unknown[] } = { rows: [] };
vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      insert: (row: unknown) => {
        captured.rows.push(row);
        return {
          select: () => ({
            single: async () => ({ data: { id: 'prop-1' }, error: null }),
          }),
        };
      },
    }),
  }),
}));

import { POST } from '../route';

type PostArg = Parameters<typeof POST>[0];
function req(body: unknown): PostArg {
  return new Request('http://localhost/api/curator/propose', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as PostArg;
}
const good = (o = {}) => ({ kind: 'word_approve', language: 'he', targetRef: 'שלום', ...o });

beforeEach(() => {
  sameOrigin.v = true;
  auth.v = true;
  auth.lastLanguage = undefined;
  auth.result = { success: true, user: { id: 'cur-1' }, languages: ['he'] };
  captured.rows = [];
});

describe('POST /api/curator/propose', () => {
  it('rejects cross-origin (403) before any work', async () => {
    sameOrigin.v = false;
    const res = await POST(req(good()));
    expect(res.status).toBe(403);
    expect(captured.rows).toHaveLength(0);
  });

  it('rejects an invalid proposal (400) before hitting auth or db', async () => {
    const res = await POST(req(good({ kind: 'nonsense' })));
    expect(res.status).toBe(400);
    expect(captured.rows).toHaveLength(0);
  });

  it('passes the proposal language to the curator auth check', async () => {
    await POST(req(good({ language: 'he' })));
    expect(auth.lastLanguage).toBe('he');
  });

  it('returns the auth failure response for a non-curator', async () => {
    auth.v = false;
    const res = await POST(req(good()));
    expect(res.status).toBe(403);
    expect(captured.rows).toHaveLength(0);
  });

  it('inserts a proposed row owned by the curator and returns its id', async () => {
    const res = await POST(req(good({ targetRef: '  שלום  ' })));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe('prop-1');
    const row = captured.rows[0] as Record<string, unknown>;
    expect(row.curator_id).toBe('cur-1');
    expect(row.status).toBe('proposed');
    expect(row.target_ref).toBe('שלום'); // trimmed by the builder
    expect(row.language).toBe('he');
  });
});
