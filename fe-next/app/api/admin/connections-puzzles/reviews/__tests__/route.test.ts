import { describe, it, expect, vi, beforeEach } from 'vitest';

const sameOrigin = { v: true };
const adminOk = { v: true };
vi.mock('@/lib/auth/sameOrigin', () => ({ isSameOrigin: () => sameOrigin.v }));
vi.mock('@/lib/auth/adminAuth', () => ({
  verifyAdminAuth: async () =>
    adminOk.v ? { success: true, user: { id: 'admin-1' } } : { success: false, response: new Response('no', { status: 401 }) },
}));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
const captured: { upserts: unknown[] } = { upserts: [] };
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      upsert: (rows: unknown) => {
        captured.upserts.push(rows);
        return Promise.resolve({ error: null });
      },
    }),
  }),
}));

import { POST } from '../route';

type PostArg = Parameters<typeof POST>[0];
function req(body: unknown): PostArg {
  return new Request('http://localhost/api/admin/connections-puzzles/reviews', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as PostArg;
}
const item = (o = {}) => ({ puzzleId: 'he-o-006', language: 'he', word1: 'כלב', word2: 'תיכון', bridge: 'ים', verdict: 'good', ...o });

beforeEach(() => {
  sameOrigin.v = true;
  adminOk.v = true;
  captured.upserts = [];
});

describe('POST /api/admin/connections-puzzles/reviews', () => {
  it('rejects cross-origin (403) before any work', async () => {
    sameOrigin.v = false;
    const res = await POST(req({ verdicts: [item()] }));
    expect(res.status).toBe(403);
    expect(captured.upserts).toHaveLength(0);
  });

  it('rejects a non-admin (401)', async () => {
    adminOk.v = false;
    const res = await POST(req({ verdicts: [item()] }));
    expect(res.status).toBe(401);
  });

  it('rejects an invalid batch (400)', async () => {
    const res = await POST(req({ verdicts: [item({ verdict: 'nope' })] }));
    expect(res.status).toBe(400);
    expect(captured.upserts).toHaveLength(0);
  });

  it('upserts a valid batch with reviewer + snapshot', async () => {
    const res = await POST(req({ verdicts: [item(), item({ puzzleId: 'en-o-001', language: 'en', verdict: 'bad', note: 'forced' })] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.saved).toBe(2);
    const rows = captured.upserts[0] as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    expect(rows[0].reviewed_by).toBe('admin-1');
    expect(rows[0].puzzle_id).toBe('he-o-006');
    expect(rows[1].verdict).toBe('bad');
    expect(rows[1].note).toBe('forced');
  });
});
