import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

/**
 * A bad code must cost a logged-out student one fast request — not an account.
 *
 * What it used to cost. The guest path checked the nickname, ran
 * `signInAnonymously` (a real, permanent `auth.users` row that cannot be
 * un-created), awaited the profile trigger for up to three seconds, and only
 * then posted the join — which answered 400. So a typo, or the code of a game
 * the teacher had just ended, bought three seconds of spinner and a junk
 * account before saying anything useful. Kahoot's bar is the opposite: a PIN it
 * does not recognise is rejected immediately, and nothing is created.
 *
 * The resolve check runs in PARALLEL with the nickname precheck, so the happy
 * path still costs one round-trip's worth of waiting, not two.
 *
 * The rule this must never break: only a CONFIDENT invalid stops the join.
 * `unverified` — rate limit, roster RPC error, offline — proceeds, because the
 * server route has the real answer and failing closed here would lock out a
 * whole school over one broken lookup (recurring pitfall class 4).
 */

const { mockUseAuth, mockSignInAsGuest, mockWaitForProfile, mockCreateClient, mockVerdict } =
  vi.hoisted(() => ({
    mockUseAuth: vi.fn(),
    mockSignInAsGuest: vi.fn(),
    mockWaitForProfile: vi.fn(),
    mockCreateClient: vi.fn(() => ({ __client: true })),
    mockVerdict: vi.fn(),
  }));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useMounted', () => ({ useMounted: () => true }));
vi.mock('@/utils/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), log: vi.fn() },
}));
vi.mock('@/utils/supabase/client', () => ({ createClient: mockCreateClient }));
vi.mock('@/lib/education/guestStudent', () => ({
  signInAsGuestStudent: mockSignInAsGuest,
  waitForProfile: mockWaitForProfile,
}));
vi.mock('@/lib/education/joinCodeVerdict', () => ({ resolveJoinCodeVerdict: mockVerdict }));
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
const NAME_ROUTE = '/api/education/guest-name';

describe('useJoinClassroom — a bad code on the guest path', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null });
    mockSignInAsGuest.mockResolvedValue({ user: { id: 'anon-1' }, error: null });
    mockWaitForProfile.mockResolvedValue(true);
    mockVerdict.mockResolvedValue('game');
    fetchMock = vi.fn(async (url: string) =>
      url === NAME_ROUTE
        ? { ok: true, status: 200, json: async () => ({ available: true, name: 'Maya' }) }
        : { ok: true, status: 200, json: async () => ({ classroomId: 'class-1' }) }
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('rejects an unrecognised code without minting an anonymous user', async () => {
    mockVerdict.mockResolvedValue('invalid');
    const { result } = renderHook(() => useJoinClassroom());

    const res = await result.current.joinClassroom('ZZZZZZ', { guestName: 'Maya' });

    expect(res).toMatchObject({ success: false, code: 'INVALID_CODE' });
    expect(mockSignInAsGuest).not.toHaveBeenCalled();
    expect(mockWaitForProfile).not.toHaveBeenCalled();
    // Never reaches the join route: nothing to enrol, nobody to enrol.
    expect(fetchMock.mock.calls.map((c) => c[0])).not.toContain(JOIN_ROUTE);
  });

  it('asks the resolver for the code the student actually typed', async () => {
    const { result } = renderHook(() => useJoinClassroom());
    await result.current.joinClassroom('TZCOQ7', { guestName: 'Maya' });
    expect(mockVerdict).toHaveBeenCalledWith('TZCOQ7');
  });

  it('lets a good code straight through to sign-in and join', async () => {
    const { result } = renderHook(() => useJoinClassroom());

    const res = await result.current.joinClassroom('TZCOQ7', { guestName: 'Maya' });

    expect(mockSignInAsGuest).toHaveBeenCalled();
    expect(res).toEqual({ success: true, classroomId: 'class-1' });
  });

  it('joins anyway when the code could not be verified', async () => {
    // Rate limit, Supabase hiccup, offline. Our problem, not the student's —
    // the server route decides, as it always did.
    mockVerdict.mockResolvedValue('unverified');
    const { result } = renderHook(() => useJoinClassroom());

    const res = await result.current.joinClassroom('Q3UQ2J', { guestName: 'Maya' });

    expect(mockSignInAsGuest).toHaveBeenCalled();
    expect(res.success).toBe(true);
  });

  it('reports the bad code, not the taken nickname, when both are wrong', async () => {
    // The student cannot act on "that name is taken" for a class they are not
    // going to reach. Say the thing that is actually blocking them.
    mockVerdict.mockResolvedValue('invalid');
    fetchMock.mockImplementationOnce(async () => ({
      ok: false,
      status: 409,
      json: async () => ({ code: 'NAME_TAKEN', suggestedName: 'Maya 2' }),
    }));
    const { result } = renderHook(() => useJoinClassroom());

    const res = await result.current.joinClassroom('ZZZZZZ', { guestName: 'Maya' });

    expect(res.code).toBe('INVALID_CODE');
  });

  it('leaves the logged-in path untouched — no extra resolve request', async () => {
    // An authed student already gets a fast, specific 400 from one POST. There
    // is no anonymous identity at risk, so there is nothing to pre-check.
    mockUseAuth.mockReturnValue({ user: { id: 'real-1' } });
    const { result } = renderHook(() => useJoinClassroom());

    await result.current.joinClassroom('ZZZZZZ');

    expect(mockVerdict).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([JOIN_ROUTE]);
  });
});
