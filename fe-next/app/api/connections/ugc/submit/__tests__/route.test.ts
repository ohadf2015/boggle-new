import { describe, it, expect, vi, beforeEach } from 'vitest';

const rateLimit = { success: true };
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => rateLimit }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));

// Server-issued guest identity (client-supplied fingerprints must be ignored).
const guestCookie = { existing: null as string | null, minted: 'srv-minted-uuid', setCalls: [] as string[] };
vi.mock('@/lib/auth/guestCookie', () => ({
  readGuestId: () => guestCookie.existing,
  newGuestId: () => guestCookie.minted,
  setGuestCookie: (_res: unknown, uuid: string) => { guestCookie.setCalls.push(uuid); },
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
  guestCookie.existing = null;
  guestCookie.setCalls = [];
});

describe('POST /api/connections/ugc/submit', () => {
  it('rejects a degenerate riddle (bridge == word) before any DB work', async () => {
    const res = await POST(req({ word1: 'מיץ', word2: 'אדומים', bridge: 'מיץ', language: 'he', displayName: 'D', guestFingerprint: 'g1' }));
    expect(res.status).toBe(400);
    expect(captured.inserts).toHaveLength(0);
  });

  it('attributes a guest suggestion to the SERVER-minted identity, not the body, and sets the cookie', async () => {
    const res = await POST(req({ word1: 'מיץ', word2: 'אדומים', bridge: 'תפוחים', language: 'he', displayName: 'Dana', guestFingerprint: 'spoofed-author' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('pending');
    expect(captured.inserts).toHaveLength(1);
    expect(captured.inserts[0].status).toBe('pending');
    expect(captured.inserts[0].bridge).toBe('תפוחים');
    expect(captured.inserts[0].creator_guest_fingerprint).toBe('srv-minted-uuid');
    expect(captured.inserts[0].creator_guest_fingerprint).not.toBe('spoofed-author');
    expect(guestCookie.setCalls).toEqual(['srv-minted-uuid']);
  });

  it('reuses an existing signed cookie identity and ignores the body fingerprint', async () => {
    guestCookie.existing = 'real-cookie-guest';
    const res = await POST(req({ word1: 'מיץ', word2: 'אדומים', bridge: 'תפוחים', language: 'he', displayName: 'Dana', guestFingerprint: 'attacker' }));
    expect(res.status).toBe(200);
    expect(captured.inserts[0].creator_guest_fingerprint).toBe('real-cookie-guest');
    expect(guestCookie.setCalls).toEqual([]);
  });

  it('returns 429 when rate limited', async () => {
    rateLimit.success = false;
    const res = await POST(req({}));
    expect(res.status).toBe(429);
  });
});
