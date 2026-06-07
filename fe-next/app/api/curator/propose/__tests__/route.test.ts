import { describe, it, expect, vi, beforeEach } from 'vitest';

const sameOrigin = { v: true };
const auth = {
  v: true,
  lastLanguage: undefined as string | undefined,
  // tier 3 = a full-capability curator (covers every proposal kind) by default;
  // individual tier-gating tests below lower it to assert the gate.
  result: { success: true, user: { id: 'cur-1' }, languages: ['he'], tier: 3 } as Record<string, unknown>,
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
  auth.result = { success: true, user: { id: 'cur-1' }, languages: ['he'], tier: 3 };
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

  describe('trust_tier capability gating', () => {
    it('rejects (403) a tier-1 curator proposing a word_approve (needs tier 2)', async () => {
      auth.result = { success: true, user: { id: 'cur-1' }, languages: ['he'], tier: 1 };
      const res = await POST(req(good({ kind: 'word_approve' })));
      expect(res.status).toBe(403);
      expect(captured.rows).toHaveLength(0); // gated before any DB write
    });

    it('allows a tier-1 curator to flag an invalid word (tier-1 capability)', async () => {
      auth.result = { success: true, user: { id: 'cur-1' }, languages: ['he'], tier: 1 };
      const res = await POST(req(good({ kind: 'word_flag_invalid' })));
      expect(res.status).toBe(200);
      expect(captured.rows).toHaveLength(1);
    });

    it('rejects (403) a tier-2 curator ruling on a puzzle verdict (needs tier 3)', async () => {
      auth.result = { success: true, user: { id: 'cur-1' }, languages: ['he'], tier: 2 };
      const res = await POST(req(good({ kind: 'puzzle_verdict', targetRef: 'puzzle-1', payload: { verdict: 'bad' } })));
      expect(res.status).toBe(403);
      expect(captured.rows).toHaveLength(0);
    });

    it('allows a tier-2 curator to approve a word', async () => {
      auth.result = { success: true, user: { id: 'cur-1' }, languages: ['he'], tier: 2 };
      const res = await POST(req(good({ kind: 'word_approve' })));
      expect(res.status).toBe(200);
      expect(captured.rows).toHaveLength(1);
    });

    it('allows a tier-3 curator to rule on a puzzle verdict', async () => {
      auth.result = { success: true, user: { id: 'cur-1' }, languages: ['he'], tier: 3 };
      const res = await POST(req(good({ kind: 'puzzle_verdict', targetRef: 'puzzle-1', payload: { verdict: 'good' } })));
      expect(res.status).toBe(200);
      expect(captured.rows).toHaveLength(1);
    });
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
