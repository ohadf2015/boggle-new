import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Real guest cookie (not mocked) so we exercise the actual Set-Cookie path.
process.env.GUEST_COOKIE_SECRET = 'test-secret-for-vote-route';

const rateLimit = { success: true };
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => rateLimit }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));

let puzzleStatus: string | null = 'approved';
const captured: { voteInserts: Record<string, unknown>[] } = { voteInserts: [] };
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => {
      const state = { head: false, insert: false, update: false };
      const b: Record<string, unknown> = {
        select: (_c: unknown, opts?: { head?: boolean }) => {
          if (opts?.head) state.head = true;
          return b;
        },
        eq: () => b,
        insert: (row: Record<string, unknown>) => {
          state.insert = true;
          captured.voteInserts.push(row);
          return b;
        },
        update: () => {
          state.update = true;
          return b;
        },
        maybeSingle: () => Promise.resolve({ data: puzzleStatus === null ? null : { status: puzzleStatus } }),
        then: (resolve: (v: unknown) => unknown) => {
          let r: unknown;
          if (state.insert || state.update) r = { error: null };
          else if (state.head) r = { count: 1 };
          else r = { data: null };
          return Promise.resolve(r).then(resolve);
        },
      };
      return b;
    },
  }),
}));

import { POST } from '../route';

const PID = '11111111-1111-1111-1111-111111111111';
function ctx() {
  return { params: Promise.resolve({ id: PID }) };
}
function req(cookie?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (cookie) headers.cookie = cookie;
  return new NextRequest(`http://localhost/api/connections/ugc/${PID}/vote`, { method: 'POST', headers });
}

beforeEach(() => {
  puzzleStatus = 'approved';
  captured.voteInserts = [];
  rateLimit.success = true;
});

describe('POST /api/connections/ugc/[id]/vote', () => {
  it('a first-time guest gets a Set-Cookie that SURVIVES the response (dedup depends on it)', async () => {
    const res = await POST(req(), ctx());
    expect(res.status).toBe(200);
    // Cookie must be on the EXACT returned response (NextResponse cookie jar).
    const cookie = res.cookies.get('lc_guest');
    expect(cookie?.value).toBeTruthy();
    // the vote row used a server-minted guest id (not client-supplied)
    expect(captured.voteInserts).toHaveLength(1);
    expect(typeof captured.voteInserts[0].voter_guest_fingerprint).toBe('string');
  });

  it('rejects voting on a non-approved riddle (404) before inserting', async () => {
    puzzleStatus = 'pending';
    const res = await POST(req(), ctx());
    expect(res.status).toBe(404);
    expect(captured.voteInserts).toHaveLength(0);
  });

  it('returns the recomputed upvote count', async () => {
    const res = await POST(req(), ctx());
    const json = await res.json();
    expect(json.upvotes).toBe(1);
  });

  it('429 when rate limited', async () => {
    rateLimit.success = false;
    const res = await POST(req(), ctx());
    expect(res.status).toBe(429);
  });
});
