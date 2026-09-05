import { vi, describe, it, expect, beforeEach } from 'vitest';
/**
 * The two challenge GET routes must read as the AUTHENTICATED user.
 *
 * `getDailyChallenges` / `getWeeklyQuests` read through the module-level client
 * from '@/lib/supabase', which is `createBrowserClient(url, ANON_KEY)`. In a
 * Next API route that client carries no session, so it is `anon` — and both
 * tables grant SELECT only `TO authenticated USING (player_id = auth.uid())`.
 * The read came back as 0 rows with `error: null`, so the route fell through to
 * its auto-assign branch and the student saw challenges that were never really
 * theirs, or nothing at all. Same silent failure as the write path.
 *
 * RLS lets a user read their own rows, so the fix is the request's own
 * authenticated client — NOT an admin read. `createRequestClient` is the right
 * helper: it uses the Bearer token when one is present (Capacitor webview,
 * third-party-cookie-blocking browsers) and the cookie client otherwise.
 */

vi.mock('next/server', () => {
  class MockNextRequest {
    url: string;
    method: string;
    headers = new Headers();
    constructor(url: string, init?: { method?: string }) {
      this.url = url;
      this.method = init?.method || 'GET';
    }
    async json() {
      return null;
    }
  }
  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json: vi.fn((data: unknown, init?: { status?: number }) => ({
        json: async () => data,
        status: init?.status || 200,
      })),
    },
  };
});

const USER = 'student-1';

/** The anon browser client. On the server it sees nothing — touching it is the bug. */
const anonSupabase = vi.hoisted(() => ({ from: vi.fn() }));
const authedSupabase = vi.hoisted(() => ({ from: vi.fn() }));
const adminSupabase = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return anonSupabase;
  },
}));
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => adminSupabase,
}));
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => authedSupabase),
  createRequestClient: vi.fn(async () => ({ supabase: authedSupabase, token: null })),
}));
vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: vi.fn(async () => ({ id: USER, email: 's@example.com' })),
}));

const mockLogger = vi.hoisted(() => ({
  log: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));
vi.mock('@/utils/logger', () => ({ __esModule: true, default: mockLogger }));

import { NextRequest } from 'next/server';
import { GET as GET_DAILY } from '../daily/route';
import { GET as GET_WEEKLY } from '../weekly/route';

/** Resolves every `.select().eq().eq()` chain to `rows`. */
function respondWith(client: { from: ReturnType<typeof vi.fn> }, rows: unknown[]) {
  client.from.mockImplementation(() => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      insert: () => builder,
      upsert: () => builder,
      single: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      then: (onOk: (v: unknown) => unknown) =>
        Promise.resolve({ data: rows, error: null }).then(onOk),
    };
    return builder;
  });
}

const DAILY_ROWS = [
  { id: 'd1', player_id: USER, challenge_type: 'practice_sessions', current_value: 2, target_value: 5 },
  { id: 'd2', player_id: USER, challenge_type: 'words_mastered', current_value: 0, target_value: 3 },
];
const WEEKLY_ROWS = [
  { id: 'w1', player_id: USER, quest_type: 'practice_sessions', current_progress: { practice_sessions: 1 } },
];

beforeEach(() => {
  vi.clearAllMocks();
  // The server-side reality this bug produced: anon sees zero rows, no error.
  respondWith(anonSupabase, []);
  respondWith(adminSupabase, []);
});

describe('GET /api/education/challenges/daily', () => {
  it("returns the student's own challenge rows instead of an empty list", async () => {
    respondWith(authedSupabase, DAILY_ROWS);

    const response = await GET_DAILY(
      new NextRequest('http://localhost/api/education/challenges/daily')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.challenges).toHaveLength(2);
    expect(body.challenges.map((c: { id: string }) => c.id)).toEqual(['d1', 'd2']);
  });

  it('reads through the request-authenticated client, never the anon browser client', async () => {
    respondWith(authedSupabase, DAILY_ROWS);

    await GET_DAILY(new NextRequest('http://localhost/api/education/challenges/daily'));

    expect(authedSupabase.from).toHaveBeenCalledWith('daily_challenges');
    expect(anonSupabase.from).not.toHaveBeenCalled();
  });

  it('does not fall through to auto-assign when the student already has challenges', async () => {
    respondWith(authedSupabase, DAILY_ROWS);

    await GET_DAILY(new NextRequest('http://localhost/api/education/challenges/daily'));

    // Auto-assign writes through the admin client; it must stay untouched.
    expect(adminSupabase.from).not.toHaveBeenCalled();
  });
});

describe('GET /api/education/challenges/weekly', () => {
  it("returns the student's own weekly quests instead of an empty list", async () => {
    respondWith(authedSupabase, WEEKLY_ROWS);

    const response = await GET_WEEKLY(
      new NextRequest('http://localhost/api/education/challenges/weekly')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.quests).toHaveLength(1);
    expect(body.quests[0].id).toBe('w1');
  });

  it('reads through the request-authenticated client, never the anon browser client', async () => {
    respondWith(authedSupabase, WEEKLY_ROWS);

    await GET_WEEKLY(new NextRequest('http://localhost/api/education/challenges/weekly'));

    expect(authedSupabase.from).toHaveBeenCalledWith('weekly_quests');
    expect(anonSupabase.from).not.toHaveBeenCalled();
  });
});

describe('read errors are logged, not swallowed', () => {
  it('logs and 500s when the authenticated read fails', async () => {
    authedSupabase.from.mockImplementation(() => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        then: (onOk: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: { message: 'permission denied', code: '42501' } }).then(onOk),
      };
      return builder;
    });

    const response = await GET_DAILY(
      new NextRequest('http://localhost/api/education/challenges/daily')
    );

    expect(response.status).toBe(500);
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('logs the missing-table carve-out on the weekly read instead of returning empty in silence', async () => {
    authedSupabase.from.mockImplementation(() => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        then: (onOk: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: { message: 'no table', code: 'PGRST205' } }).then(onOk),
      };
      return builder;
    });

    await GET_WEEKLY(new NextRequest('http://localhost/api/education/challenges/weekly'));

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('weekly_quests'),
      expect.anything()
    );
  });
});
