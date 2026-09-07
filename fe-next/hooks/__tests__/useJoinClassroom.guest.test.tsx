import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockUseAuth, mockSignInAsGuest, mockWaitForProfile, mockCreateClient } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockSignInAsGuest: vi.fn(),
  mockWaitForProfile: vi.fn(),
  mockCreateClient: vi.fn(() => ({ __client: true })),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useMounted', () => ({ useMounted: () => true }));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), log: vi.fn() } }));
vi.mock('@/utils/supabase/client', () => ({ createClient: mockCreateClient }));
vi.mock('@/lib/education/guestStudent', () => ({
  signInAsGuestStudent: mockSignInAsGuest,
  waitForProfile: mockWaitForProfile,
}));
vi.mock('@/lib/supabase/education', () => ({
  getClassrooms: vi.fn(),
  getClassroom: vi.fn(),
  createClassroom: vi.fn(),
  updateClassroom: vi.fn(),
  deleteClassroom: vi.fn(),
  joinClassroom: vi.fn(),
}));

import { useJoinClassroom } from '../useClassroom';

const JOIN_ROUTE = '/api/education/classroom/join';
/**
 * The guest path now asks the server whether the nickname is free BEFORE minting
 * the anonymous user. It has to be that order: two students called Priya both
 * slug to `priya`, the `handle_new_user` trigger writes that into the UNIQUE
 * `profiles.username`, and the raise surfaces as a Supabase 500 from
 * `signInAnonymously` — by which point the auth user exists and cannot be
 * un-created. So a guest join makes TWO requests, precheck then join.
 */
const NAME_ROUTE = '/api/education/guest-name';

/** Which routes were hit, in order — the ordering IS the contract here. */
const routesCalled = (mock: ReturnType<typeof vi.fn>) =>
  mock.mock.calls.map((c) => c[0]);

describe('useJoinClassroom — guest (account-less) path', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignInAsGuest.mockResolvedValue({ user: { id: 'anon-1' }, error: null });
    mockWaitForProfile.mockResolvedValue(true);
    // The join now goes through the cap-enforcing server route.
    fetchMock = vi.fn(async (url: string) =>
      url === NAME_ROUTE
        ? { ok: true, status: 200, json: async () => ({ available: true, name: 'Maya' }) }
        : { ok: true, status: 200, json: async () => ({ classroomId: 'class-1' }) }
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('logged-in student joins via the server route (no anonymous sign-in)', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'real-1' } });
    const { result } = renderHook(() => useJoinClassroom());

    const res = await result.current.joinClassroom('ABC123');

    expect(mockSignInAsGuest).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(JOIN_ROUTE);
    expect(JSON.parse(init.body)).toMatchObject({ joinCode: 'ABC123' });
    expect(res).toEqual({ success: true, classroomId: 'class-1' });
  });

  it('logged-out student with a name signs in anonymously, awaits profile, then joins', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useJoinClassroom());

    const res = await result.current.joinClassroom('ABC123', { guestName: 'Maya' });

    expect(mockSignInAsGuest).toHaveBeenCalledWith({ __client: true }, 'Maya');
    // Race-safe: profile awaited BEFORE the join request.
    expect(mockWaitForProfile).toHaveBeenCalledWith({ __client: true }, 'anon-1');

    // Precheck FIRST, then the join. The order is the point: once
    // `signInAnonymously` has run, the auth user exists and a colliding
    // username has already raised inside the trigger — there is nothing left to
    // check and nothing to undo.
    expect(routesCalled(fetchMock)).toEqual([NAME_ROUTE, JOIN_ROUTE]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ name: 'Maya', joinCode: 'ABC123' });
    expect(res).toEqual({ success: true, classroomId: 'class-1' });
  });

  /**
   * The precheck asks "is this name taken in THIS class?" — and it can only
   * answer that if it is told which class.
   *
   * The route scopes its 409 to the roster behind `joinCode`, and deliberately
   * FAILS OPEN when that field is absent: no classroom, no roster, every name
   * available. The client was not sending it, so the check answered "available"
   * to everything and was dormant in production — while a critic on a brand-new,
   * empty classroom still saw a 409 on the very first join of "Priya", which is
   * the shape of an unscoped check.
   *
   * Sending the code is the whole fix. Without this the route's scoping is
   * unreachable code (recurring pitfall class 4: it fails open and says nothing).
   */
  it('scopes the precheck to THIS classroom by sending the join code', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useJoinClassroom());

    await result.current.joinClassroom('P45KRT', { guestName: 'Priya' });

    const precheckBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(precheckBody.joinCode).toBe('P45KRT');
  });

  it('stops on a 409 from the precheck and never mints an anonymous user', async () => {
    // GIVEN a class that already has a Priya. Both names slug to `priya`, so
    // signing in would raise inside the `handle_new_user` trigger and return a
    // Supabase 500 — after the auth user exists.
    mockUseAuth.mockReturnValue({ user: null });
    fetchMock.mockImplementationOnce(async () => ({
      ok: false,
      status: 409,
      json: async () => ({
        available: false, code: 'NAME_TAKEN', name: 'priya', suggestedName: 'priya 2',
      }),
    }));
    const { result } = renderHook(() => useJoinClassroom());

    const res = await result.current.joinClassroom('ABC123', { guestName: 'priya' });

    // THEN we stop before creating anything, and hand back a name that works
    expect(mockSignInAsGuest).not.toHaveBeenCalled();
    expect(routesCalled(fetchMock)).toEqual([NAME_ROUTE]);
    expect(res).toMatchObject({ success: false, code: 'NAME_TAKEN', suggestedName: 'priya 2' });
  });

  it('joins anyway when the precheck itself fails', async () => {
    // GIVEN a precheck that errors — our outage, not the student's problem
    mockUseAuth.mockReturnValue({ user: null });
    fetchMock.mockImplementationOnce(async () => { throw new Error('network'); });
    const { result } = renderHook(() => useJoinClassroom());

    const res = await result.current.joinClassroom('ABC123', { guestName: 'Maya' });

    // THEN the join still proceeds. Failing closed here would turn one broken
    // request into nobody in the school being able to join.
    expect(mockSignInAsGuest).toHaveBeenCalled();
    expect(res.success).toBe(true);
  });

  it('logged-out with NO name preserves the not-authenticated guard', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useJoinClassroom());

    const res = await result.current.joinClassroom('ABC123');

    expect(mockSignInAsGuest).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.success).toBe(false);
  });

  it('surfaces the anonymous sign-in error (e.g. feature disabled) and does not join', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    mockSignInAsGuest.mockResolvedValue({ user: null, error: 'Anonymous sign-ins are disabled' });
    const { result } = renderHook(() => useJoinClassroom());

    const res = await result.current.joinClassroom('ABC123', { guestName: 'Maya' });

    // The precheck ran (it precedes sign-in), but the JOIN did not: a failed
    // anonymous sign-in must not be followed by a membership write for a
    // student who has no identity.
    expect(routesCalled(fetchMock)).toEqual([NAME_ROUTE]);
    expect(res.success).toBe(false);
    expect(res.error).toContain('disabled');
  });

  it('surfaces the free-tier student cap (403) as a machine code, not English prose', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'real-1' } });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      // Verbatim from `canAddStudent` (`lib/subscriptions.ts:197`) — what the route
      // ACTUALLY sends. The earlier version of this test invented a friendlier
      // "reached its capacity. Please contact your teacher." string and asserted on
      // that, so it went green while the real string ("free tier limit") reached the
      // student's screen untranslated.
      json: async () => ({
        error: 'STUDENT_LIMIT_REACHED',
        message: 'This classroom has reached the free tier limit of 10 students.',
        currentCount: 10,
        limit: 10,
      }),
    });
    const { result } = renderHook(() => useJoinClassroom());

    const res = await result.current.joinClassroom('ABC123');

    expect(res.success).toBe(false);
    // The code is what callers can branch on in any locale. Dropping it forces the
    // form to substring-match English, which is how the untranslated leak happened.
    expect(res.code).toBe('STUDENT_LIMIT_REACHED');
  });

  it('tags a bad/unknown join code (400) so callers need not match English', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'real-1' } });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Classroom not found. Please check the code with your teacher.' }),
    });
    const { result } = renderHook(() => useJoinClassroom());

    const res = await result.current.joinClassroom('ABC123');

    expect(res.success).toBe(false);
    // Every 400 this route emits is a code problem (bad JSON, failed Zod parse, or no
    // such classroom); the missing-name case is a 401, not a 400.
    expect(res.code).toBe('INVALID_CODE');
  });
});
