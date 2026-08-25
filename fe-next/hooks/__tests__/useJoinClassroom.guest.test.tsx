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

describe('useJoinClassroom — guest (account-less) path', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignInAsGuest.mockResolvedValue({ user: { id: 'anon-1' }, error: null });
    mockWaitForProfile.mockResolvedValue(true);
    // The join now goes through the cap-enforcing server route.
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ classroomId: 'class-1' }),
    });
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
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(JOIN_ROUTE);
    expect(res).toEqual({ success: true, classroomId: 'class-1' });
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

    expect(fetchMock).not.toHaveBeenCalled();
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
