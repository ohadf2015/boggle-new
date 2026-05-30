import { describe, it, expect, vi, beforeEach } from 'vitest';

const rateLimit = { success: true };
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => rateLimit }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));

const captured: { inserts: Record<string, unknown>[] } = { inserts: [] };
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => {
      const b: Record<string, unknown> = {
        insert: (row: Record<string, unknown>) => {
          captured.inserts.push(row);
          return b;
        },
        select: () => b,
        single: () => Promise.resolve({ data: { id: 'new-id', status: 'pending' }, error: null }),
      };
      return b;
    },
  }),
}));

import { POST } from '../route';

type PostArg = Parameters<typeof POST>[0];
function req(body: unknown): PostArg {
  return new Request('http://localhost/api/connections/ugc/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as PostArg;
}

beforeEach(() => {
  captured.inserts = [];
  rateLimit.success = true;
});

describe('POST /api/connections/ugc/submit', () => {
  it('rejects a degenerate riddle (bridge == word) before any DB work', async () => {
    const res = await POST(req({ word1: 'מיץ', word2: 'אדומים', bridge: 'מיץ', language: 'he', displayName: 'D', guestFingerprint: 'g1' }));
    expect(res.status).toBe(400);
    expect(captured.inserts).toHaveLength(0);
  });

  it('inserts a valid guest suggestion as pending', async () => {
    const res = await POST(req({ word1: 'מיץ', word2: 'אדומים', bridge: 'תפוחים', language: 'he', displayName: 'Dana', guestFingerprint: 'g1' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('pending');
    expect(captured.inserts).toHaveLength(1);
    expect(captured.inserts[0].status).toBe('pending');
    expect(captured.inserts[0].bridge).toBe('תפוחים');
    expect(captured.inserts[0].creator_guest_fingerprint).toBe('g1');
  });

  it('returns 429 when rate limited', async () => {
    rateLimit.success = false;
    const res = await POST(req({}));
    expect(res.status).toBe(429);
  });
});
