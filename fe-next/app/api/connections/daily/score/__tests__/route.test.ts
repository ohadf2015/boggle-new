import { describe, it, expect, vi, beforeEach } from 'vitest';

const rateLimit = { success: true };
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => rateLimit }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

// Server-issued guest identity. readGuestId returns the verified cookie id (null =
// no/invalid cookie); newGuestId mints a fresh one; setGuestCookie sets the response cookie.
const guestCookie = { existing: null as string | null, minted: 'srv-minted-uuid', setCalls: [] as string[] };
vi.mock('@/lib/auth/guestCookie', () => ({
  readGuestId: () => guestCookie.existing,
  newGuestId: () => guestCookie.minted,
  setGuestCookie: (_res: unknown, uuid: string) => { guestCookie.setCalls.push(uuid); },
}));

const getUserResult: { data: { user: { id: string } | null } } = { data: { user: null } };
vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => getUserResult } }),
}));

const maybeSingleQueue: Array<{ data: unknown }> = [];
const captured: { inserts: Record<string, unknown>[]; orFilters: string[]; updates: Record<string, unknown>[] } = {
  inserts: [],
  orFilters: [],
  updates: [],
};

function makeBuilder() {
  const state = { head: false, or: null as string | null, insert: null as unknown, update: null as unknown };
  const b: Record<string, unknown> = {
    select: (_cols: unknown, opts?: { head?: boolean }) => {
      if (opts?.head) state.head = true;
      return b;
    },
    eq: () => b,
    or: (f: string) => {
      state.or = f;
      captured.orFilters.push(f);
      return b;
    },
    insert: (row: Record<string, unknown>) => {
      state.insert = row;
      captured.inserts.push(row);
      return b;
    },
    update: (row: Record<string, unknown>) => {
      state.update = row;
      captured.updates.push(row);
      return b;
    },
    maybeSingle: () => Promise.resolve(maybeSingleQueue.shift() ?? { data: null }),
    single: () => Promise.resolve({ data: null }),
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
      let result: unknown;
      if (state.insert || state.update) result = { error: null };
      else if (state.or) result = { count: 0 };
      else if (state.head) result = { count: 1 };
      else result = { data: null };
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return b;
}
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({ from: () => makeBuilder() }),
}));

import { POST } from '../route';

type PostArg = Parameters<typeof POST>[0];
function req(body: unknown): PostArg {
  return new Request('http://localhost/api/connections/daily/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as PostArg;
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

beforeEach(() => {
  maybeSingleQueue.length = 0;
  captured.inserts = [];
  captured.orFilters = [];
  captured.updates = [];
  getUserResult.data.user = null;
  rateLimit.success = true;
  guestCookie.existing = null;
  guestCookie.setCalls = [];
});

describe('POST /api/connections/daily/score', () => {
  it('rejects a cheated score before any DB work (clamp)', async () => {
    const res = await POST(
      req({ puzzleDate: today(), language: 'he', displayName: 'x', score: 99999999, timeTakenSeconds: 1, puzzlesSolved: 5, guestFingerprint: 'g1' }),
    );
    expect(res.status).toBe(400);
    expect(captured.inserts).toHaveLength(0);
  });

  it('inserts a guest first-play with a SERVER-minted identity (not the body), sets the cookie', async () => {
    maybeSingleQueue.push({ data: null }, { data: null }); // D-1 row, then today's row
    const res = await POST(
      // Attacker supplies a guestFingerprint in the body — it must be ignored.
      req({ puzzleDate: today(), language: 'he', displayName: 'Dana', score: 500, timeTakenSeconds: 42, puzzlesSolved: 5, guestFingerprint: 'spoofed-victim-id' }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe('insert');
    expect(json.streak).toBe(1); // nextStreakValue(null)
    expect(captured.inserts).toHaveLength(1);
    expect(captured.inserts[0].score).toBe(500);
    expect(captured.inserts[0].streak).toBe(1);
    // Identity is the server-minted id, NEVER the client-supplied fingerprint.
    expect(captured.inserts[0].guest_fingerprint).toBe('srv-minted-uuid');
    expect(captured.inserts[0].guest_fingerprint).not.toBe('spoofed-victim-id');
    expect(guestCookie.setCalls).toEqual(['srv-minted-uuid']); // fresh cookie issued
    expect(captured.orFilters[0]).toBe('score.gt.500,and(score.eq.500,time_taken_seconds.lt.42)');
    expect(json.currentRank).toBe(1);
  });

  it('uses the existing signed cookie identity and ignores any body fingerprint', async () => {
    guestCookie.existing = 'real-cookie-guest';
    maybeSingleQueue.push({ data: null }, { data: null });
    const res = await POST(
      req({ puzzleDate: today(), language: 'he', displayName: 'Dana', score: 300, timeTakenSeconds: 30, puzzlesSolved: 5, guestFingerprint: 'attacker-controlled' }),
    );
    expect(res.status).toBe(200);
    expect(captured.inserts[0].guest_fingerprint).toBe('real-cookie-guest');
    expect(guestCookie.setCalls).toEqual([]); // reused, not re-minted
  });

  it('returns 429 when rate limited', async () => {
    rateLimit.success = false;
    const res = await POST(req({}));
    expect(res.status).toBe(429);
  });
});
