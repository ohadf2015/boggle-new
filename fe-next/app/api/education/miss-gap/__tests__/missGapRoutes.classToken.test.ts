/**
 * A homework link proves which class it belongs to with a signed `k` token.
 * The class key alone is guessable, so it must not be enough to write.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('next/server', () => {
  class MockNextRequest {
    url: string;
    method: string;
    headers = new Map<string, string>();
    private body: unknown;
    constructor(url: string, init?: { method?: string; body?: unknown }) {
      this.url = url;
      this.method = init?.method || 'GET';
      this.body = init?.body;
    }
    async json() {
      return this.body;
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

const mockLogger = vi.hoisted(() => ({ log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('@/utils/logger', () => ({ __esModule: true, default: mockLogger }));

const mockCheckApiRateLimit = vi.fn().mockReturnValue({ success: true });
vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: (...args: unknown[]) => mockCheckApiRateLimit(...args),
}));

const mockGetAuthedUser = vi.fn();
vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: (...args: unknown[]) => mockGetAuthedUser(...args),
}));

const mockAdmin = vi.fn();
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => mockAdmin(),
}));

import { NextRequest } from 'next/server';
import { POST } from '../complete/route';
import { GET } from '../progress/route';
import { BODY, CLASS_TOKEN, OTHER_CLASS_TOKEN, makeClient, resetState, state } from './missGapHarness';

const PROGRESS = 'http://x/api/education/miss-gap/progress?classKey=week%203%20vocab%3A%3Ams.%20g&dueDate=2026-09-12';
const tampered = CLASS_TOKEN.slice(0, -2) + (CLASS_TOKEN.endsWith('A') ? 'BB' : 'AA');

const complete = (body: unknown) =>
  POST(new NextRequest('http://x/api/education/miss-gap/complete', { method: 'POST', body }) as never);
const progress = (k?: string) =>
  GET(new NextRequest(k === undefined ? PROGRESS : `${PROGRESS}&k=${encodeURIComponent(k)}`) as never);
const asOwner = () => {
  mockGetAuthedUser.mockResolvedValue({ id: 'teacher-1' });
  state.callerProfile = { user_role: 'teacher', is_admin: false };
  state.owners.set(BODY.classKey, 'teacher-1');
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckApiRateLimit.mockReturnValue({ success: true });
  mockGetAuthedUser.mockResolvedValue(null);
  resetState();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-11T10:00:00Z'));
  mockAdmin.mockReturnValue(makeClient());
});

afterEach(() => {
  vi.useRealTimers();
});

describe('complete: the class token gates every write', () => {
  it('records the run when the link carries a valid token', async () => {
    const res = await complete(BODY);
    expect(res.status).toBe(200);
    expect(state.upsertedRun).toMatchObject({ class_key: BODY.classKey });
  });

  it.each([
    ['a tampered token', tampered],
    ['a token for another class', OTHER_CLASS_TOKEN],
    ['garbage', 'not-a-token'],
  ])('rejects %s with 400 and never touches storage', async (_label, classToken) => {
    const res = await complete({ ...BODY, classToken });
    expect(res.status).toBe(400);
    expect(mockAdmin).not.toHaveBeenCalled();
    expect(state.upsertedRun).toBeNull();
    expect(state.upsertedStreak).toBeNull();
  });

  it('rejects a token far longer than any real one', async () => {
    const res = await complete({ ...BODY, classToken: 'a'.repeat(5000) });
    expect(res.status).toBe(400);
    expect(state.upsertedRun).toBeNull();
  });

  it('an old link without a token is answered, logged and not written', async () => {
    const { classToken: _drop, ...legacy } = BODY;
    void _drop;
    const res = await complete(legacy);
    const data = await res.json();
    expect(res.status).toBe(403);
    expect(data).toMatchObject({ ok: false, code: 'class_link_unsigned' });
    expect(mockAdmin).not.toHaveBeenCalled();
    expect(state.upsertedRun).toBeNull();
    expect(state.upsertedStreak).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('a blank token is treated as an old link, not a forgery', async () => {
    const res = await complete({ ...BODY, classToken: '' });
    expect(res.status).toBe(403);
    expect(state.upsertedRun).toBeNull();
  });

  it('with no secret configured nothing verifies, so nothing is written', async () => {
    delete process.env.PARENT_REPORT_SECRET;
    const res = await complete(BODY);
    expect(res.status).toBe(400);
    expect(state.upsertedRun).toBeNull();
  });
});

describe('progress: counts for old links, 400 for forged ones, a token for the owner', () => {
  it('an old link with no token still reads the class counts', async () => {
    const res = await progress();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.players).toBe(2);
    expect(data.runs).toEqual([]);
    expect(data.classToken).toBeUndefined();
  });

  it('a valid token reads the same counts', async () => {
    const data = await (await progress(CLASS_TOKEN)).json();
    expect(data.players).toBe(2);
  });

  it.each([
    ['a tampered token', tampered],
    ['a token for another class', OTHER_CLASS_TOKEN],
  ])('rejects %s with 400 before reading anything', async (_label, k) => {
    const res = await progress(k);
    expect(res.status).toBe(400);
    expect(mockAdmin).not.toHaveBeenCalled();
  });

  it('hands the owning teacher the token their share link must carry', async () => {
    asOwner();
    const data = await (await progress()).json();
    expect(data.runs).toHaveLength(2);
    expect(data.classToken).toBe(CLASS_TOKEN);
  });

  it('never hands a token to a teacher who does not own the key', async () => {
    state.owners.set(BODY.classKey, 'teacher-1');
    mockGetAuthedUser.mockResolvedValue({ id: 'teacher-2' });
    state.callerProfile = { user_role: 'teacher', is_admin: false };
    const data = await (await progress()).json();
    expect(data.classToken).toBeUndefined();
  });

  it('never hands a token to a signed-in student', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: 'student-1' });
    state.callerProfile = { user_role: 'student', is_admin: false };
    const data = await (await progress()).json();
    expect(data.classToken).toBeUndefined();
  });

  it('the owner still gets names when the secret is missing, without a token, and it is logged', async () => {
    delete process.env.PARENT_REPORT_SECRET;
    asOwner();
    const res = await progress();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.runs).toHaveLength(2);
    expect(data.classToken).toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
